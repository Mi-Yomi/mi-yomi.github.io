import { memo } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const ProfileHeader = memo(function ProfileHeader() {
    const { userProfile, handleProfileImage, user, I, setNameEditOpen, favCount, histCount, revCount, friends, setProfileTab } = useApp();

    return (
        <>
            <div className="profile-header">
                <div className="profile-cover" style={{ backgroundImage: userProfile?.cover_url ? `url(${userProfile.cover_url})` : '' }}>
                        <label className="profile-cover-edit" aria-label="Изменить обложку профиля">📷 <input type="file" accept="image/*" hidden onChange={e => handleProfileImage(e, 'cover')} /></label>
                </div>
                <div className="profile-user">
                    <div className="profile-avatar-wrap">
                        {userProfile?.avatar_url ? <img src={userProfile.avatar_url} className="profile-avatar" alt="Ваш аватар" /> : <div className="profile-avatar-placeholder">{user.email[0].toUpperCase()}</div>}
                        <label className="profile-avatar-edit" aria-label="Изменить аватар">📷 <input type="file" accept="image/*" hidden onChange={e => handleProfileImage(e, 'avatar')} /></label>
                    </div>
                    <div className="profile-info">
                        <button className="profile-name" onClick={() => setNameEditOpen(true)} aria-label="Изменить имя профиля">{userProfile?.username} {I.edit}</button>
                        <div className="profile-tag">#{userProfile?.tag}</div>
                    </div>
                </div>
            </div>
            <div className="profile-stats">
                <button className="profile-stat" onClick={() => setProfileTab('favorites')}><span className="profile-stat-num">{favCount}</span><span className="profile-stat-label">Избранное</span></button>
                <button className="profile-stat" onClick={() => setProfileTab('history')}><span className="profile-stat-num">{histCount}</span><span className="profile-stat-label">Просмотрено</span></button>
                <button className="profile-stat" onClick={() => setProfileTab('reviews')}><span className="profile-stat-num">{revCount}</span><span className="profile-stat-label">Отзывы</span></button>
                <button className="profile-stat" onClick={() => setProfileTab('friends')}><span className="profile-stat-num">{friends.length}</span><span className="profile-stat-label">Друзья</span></button>
            </div>
        </>
    );
});

export default ProfileHeader;
