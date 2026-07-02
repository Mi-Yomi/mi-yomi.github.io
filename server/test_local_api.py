#!/usr/bin/env python3
"""Unit tests for the HADES local API (stdlib only — no bcrypt/google-auth needed).

Run: python3 server/test_local_api.py
"""
import importlib.util
import os
import sys
import tempfile
import unittest
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
os.environ['HADES_DB_PATH'] = os.path.join(tempfile.mkdtemp(prefix='hades-test-'), 'test.sqlite')
os.environ.setdefault('HADES_ADMIN_EMAIL', 'admin@example.com')

spec = importlib.util.spec_from_file_location('local_api', os.path.join(HERE, 'local-api.py'))
api = importlib.util.module_from_spec(spec)
sys.modules['local_api'] = api
spec.loader.exec_module(api)


def make_user(c, email, admin=False, status='approved'):
    uid = str(uuid.uuid4())
    c.execute('insert into users(id,email,password_hash,created_at) values(?,?,?,?)',
              (uid, email, 'x', api.now_iso()))
    api.upsert_row(c, 'profiles', {
        'id': uid, 'email': email, 'username': email.split('@')[0],
        'tag': '1234', 'is_admin': admin, 'status': status,
    })
    return {'id': uid, 'email': email}


class FilterTests(unittest.TestCase):
    def test_eq_neq_ilike_in(self):
        row = {'name': 'Hades', 'n': 5}
        self.assertTrue(api.match_filter(row, {'op': 'eq', 'key': 'name', 'value': 'Hades'}))
        self.assertTrue(api.match_filter(row, {'op': 'neq', 'key': 'name', 'value': 'Zeus'}))
        self.assertTrue(api.match_filter(row, {'op': 'ilike', 'key': 'name', 'value': '%had%'}))
        self.assertTrue(api.match_filter(row, {'op': 'in', 'key': 'n', 'value': [1, 5]}))
        self.assertTrue(api.match_filter(row, {'op': 'gt', 'key': 'n', 'value': 4}))
        self.assertFalse(api.match_filter(row, {'op': 'gte', 'key': 'n', 'value': 6}))

    def test_unknown_operator_raises(self):
        with self.assertRaises(ValueError):
            api.match_filter({'a': 1}, {'op': 'contains', 'key': 'a', 'value': 1})

    def test_apply_query_order_and_range(self):
        rows = [{'id': str(i), 'v': i} for i in range(10)]
        out, count = api.apply_query(rows, {'order': {'key': 'v', 'ascending': False}, 'offset': 0, 'end': 2})
        self.assertEqual(count, 10)
        self.assertEqual([r['v'] for r in out], [9, 8, 7])


class PasswordTests(unittest.TestCase):
    def test_pbkdf2_roundtrip(self):
        stored = api.hash_password('secret123')
        self.assertTrue(api.verify_password('secret123', stored))
        self.assertFalse(api.verify_password('wrong', stored))


class QueryAuthTests(unittest.TestCase):
    def setUp(self):
        api.init_db()
        self.c = api.db()
        self.c.execute('delete from rows')
        self.c.execute('delete from users')
        self.c.execute('delete from sessions')
        self.alice = make_user(self.c, 'alice@example.com')
        self.bob = make_user(self.c, 'bob@example.com')
        self.admin = make_user(self.c, 'root@example.com', admin=True)

    def tearDown(self):
        self.c.commit()
        self.c.close()

    def q(self, user, **body):
        return api.handle_query(self.c, user, body)

    def test_unknown_table_rejected(self):
        status, payload = self.q(self.alice, table='secrets', action='select')
        self.assertEqual(status, 400)

    def test_cannot_update_others_profile(self):
        status, _ = self.q(self.alice, table='profiles', action='update',
                           values={'username': 'pwned'},
                           filters=[{'op': 'eq', 'key': 'id', 'value': self.bob['id']}])
        self.assertEqual(status, 403)

    def test_cannot_self_grant_admin(self):
        status, payload = self.q(self.alice, table='profiles', action='update',
                                 values={'is_admin': True, 'status': 'approved', 'username': 'alice2'},
                                 filters=[{'op': 'eq', 'key': 'id', 'value': self.alice['id']}])
        self.assertEqual(status, 200)
        profile = api.get_profile(self.c, self.alice['id'])
        self.assertEqual(profile['username'], 'alice2')      # allowed field applied
        self.assertFalse(profile.get('is_admin') is True)    # protected field stripped

    def test_admin_can_moderate_others(self):
        status, _ = self.q(self.admin, table='profiles', action='update',
                           values={'status': 'approved'},
                           filters=[{'op': 'eq', 'key': 'id', 'value': self.bob['id']}])
        self.assertEqual(status, 200)
        self.assertEqual(api.get_profile(self.c, self.bob['id'])['status'], 'approved')

    def test_insert_with_foreign_user_id_rejected(self):
        status, _ = self.q(self.alice, table='reviews', action='insert',
                           values={'user_id': self.bob['id'], 'movie_id': '1', 'text': 'spoof'})
        self.assertEqual(status, 403)

    def test_delete_scoped_to_owner(self):
        self.q(self.alice, table='reviews', action='insert',
               values={'user_id': self.alice['id'], 'movie_id': '1', 'text': 'mine'})
        self.q(self.bob, table='reviews', action='insert',
               values={'user_id': self.bob['id'], 'movie_id': '1', 'text': 'bobs'})
        # unfiltered delete matches bob's row too → forbidden, nothing deleted
        status, _ = self.q(self.alice, table='reviews', action='delete', filters=[])
        self.assertEqual(status, 403)
        rows, count = api.apply_query(api.load_rows(self.c, 'reviews'), {})
        self.assertEqual(count, 2)
        # scoped to own rows → ok
        status, _ = self.q(self.alice, table='reviews', action='delete',
                           filters=[{'op': 'eq', 'key': 'user_id', 'value': self.alice['id']}])
        self.assertEqual(status, 200)

    def test_friend_can_accept_request(self):
        _, payload = self.q(self.alice, table='friendships', action='insert',
                            values={'user_id': self.alice['id'], 'friend_id': self.bob['id'], 'status': 'pending'})
        fid = payload['data'][0]['id']
        status, _ = self.q(self.bob, table='friendships', action='update',
                           values={'status': 'accepted'},
                           filters=[{'op': 'eq', 'key': 'id', 'value': fid}])
        self.assertEqual(status, 200)

    def test_curated_lists_admin_only(self):
        status, _ = self.q(self.alice, table='curated_lists', action='insert',
                           values={'user_id': self.alice['id'], 'title': 'x'})
        self.assertEqual(status, 403)
        status, _ = self.q(self.admin, table='curated_lists', action='insert',
                           values={'user_id': self.admin['id'], 'title': 'x'})
        self.assertEqual(status, 200)

    def test_new_profile_status_is_server_decided(self):
        api.WHITELIST_ENABLED = True
        mallory = {'id': str(uuid.uuid4()), 'email': 'mallory@example.com'}
        self.c.execute('insert into users(id,email,password_hash,created_at) values(?,?,?,?)',
                       (mallory['id'], mallory['email'], 'x', api.now_iso()))
        status, payload = self.q(mallory, table='profiles', action='insert',
                                 values={'id': mallory['id'], 'username': 'mallory',
                                         'status': 'approved', 'is_admin': True})
        self.assertEqual(status, 200)
        saved = payload['data'][0]
        self.assertEqual(saved['status'], 'pending')
        self.assertFalse(saved['is_admin'])

    def test_upsert_conflict_respects_ownership(self):
        self.q(self.alice, table='review_reactions', action='insert',
               values={'user_id': self.alice['id'], 'review_id': 'r1', 'type': 'like'})
        # bob upserting with alice's conflict keys must not steal her row
        status, _ = self.q(self.bob, table='review_reactions', action='upsert',
                           values={'user_id': self.alice['id'], 'review_id': 'r1', 'type': 'dislike'},
                           onConflict='user_id,review_id')
        self.assertEqual(status, 403)

    def test_select_embeds_profiles_and_counts(self):
        _, payload = self.q(self.alice, table='reviews', action='insert',
                            values={'user_id': self.alice['id'], 'movie_id': '42', 'text': 'good'})
        review_id = payload['data'][0]['id']
        self.q(self.bob, table='review_comments', action='insert',
               values={'user_id': self.bob['id'], 'review_id': review_id, 'text': 'agree'})
        status, payload = self.q(self.bob, table='reviews', action='select',
                                 select='*, profiles(username, tag, avatar_url), review_comments(count)',
                                 filters=[{'op': 'eq', 'key': 'movie_id', 'value': '42'}])
        self.assertEqual(status, 200)
        row = payload['data'][0]
        self.assertEqual(row['profiles']['username'], 'alice')
        self.assertEqual(row['review_comments'], [{'count': 1}])

    def test_select_embed_alias_join(self):
        _, payload = self.q(self.alice, table='friendships', action='insert',
                            values={'user_id': self.alice['id'], 'friend_id': self.bob['id'], 'status': 'accepted'})
        status, payload = self.q(self.alice, table='friendships', action='select',
                                 select='*, friend:friend_id(id, username, tag, avatar_url), user:user_id(id, username, tag, avatar_url)',
                                 filters=[{'op': 'eq', 'key': 'status', 'value': 'accepted'}])
        self.assertEqual(status, 200)
        row = payload['data'][0]
        self.assertEqual(row['friend']['username'], 'bob')
        self.assertEqual(row['user']['username'], 'alice')


class SessionTests(unittest.TestCase):
    def setUp(self):
        api.init_db()
        self.c = api.db()
        self.c.execute('delete from users')
        self.c.execute('delete from sessions')
        self.user = make_user(self.c, 'sess@example.com')

    def tearDown(self):
        self.c.commit()
        self.c.close()

    def test_valid_session_resolves(self):
        token = api.make_session(self.c, self.user['id'])
        row = api.get_auth_user(self.c, {'authorization': f'Bearer {token}'})
        self.assertEqual(row['id'], self.user['id'])

    def test_expired_session_rejected_and_deleted(self):
        token = api.make_session(self.c, self.user['id'])
        expired = int(__import__('time').time()) - api.SESSION_TTL_SECONDS - 10
        self.c.execute('update sessions set created_at=? where token=?', (expired, token))
        self.assertIsNone(api.get_auth_user(self.c, {'authorization': f'Bearer {token}'}))
        self.assertIsNone(self.c.execute('select 1 from sessions where token=?', (token,)).fetchone())


class RateLimitTests(unittest.TestCase):
    def test_rate_limit_kicks_in(self):
        key = f'test:{uuid.uuid4()}'
        for _ in range(api.AUTH_RATE_LIMIT):
            self.assertFalse(api.rate_limited(key))
        self.assertTrue(api.rate_limited(key))


class StatusPolicyTests(unittest.TestCase):
    def test_default_status(self):
        api.WHITELIST_ENABLED = True
        self.assertEqual(api.default_status('admin@example.com'), 'approved')
        self.assertEqual(api.default_status('rando@example.com'), 'pending')
        api.WHITELIST_ENABLED = False
        self.assertEqual(api.default_status('rando@example.com'), 'approved')
        api.WHITELIST_ENABLED = True


if __name__ == '__main__':
    unittest.main(verbosity=2)
