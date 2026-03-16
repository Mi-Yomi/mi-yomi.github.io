import { memo } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const ProfileHeader = memo(function ProfileHeader() {
    const { userProfile, handleProfileImage, user, I, setNameEditOpen, favorites, history, reviews, friends, setProfileTab } = useApp();

    return (
        <>
            <div className="profile-header">
                <div className="profile-cover" style={{ backgroundImage: userProfile?.cover_url ? `url(${userProfile.cover_url})` : '' }}>
                    <label className="profile-cover-edit">📷 <input type="file" accept="image/*" hidden onChange={e => handleProfileImage(e, 'cover')} /></label>
                </div>
                <div className="profile-user">
                    <div className="profile-avatar-wrap">
                        {userProfile?.avatar_url ? <img src={userProfile.avatar_url} className="profile-avatar" /> : <div className="profile-avatar-placeholder">{user.email[0].toUpperCase()}</div>}
                        <label className="profile-avatar-edit">📷 <input type="file" accept="image/*" hidden onChange={e => handleProfileImage(e, 'avatar')} /></label>
                    </div>
                    <div className="profile-info">
                        <div className="profile-name" onClick={() => setNameEditOpen(true)}>{userProfile?.username} {I.edit}</div>
                        <div className="profile-tag">#{userProfile?.tag}</div>
                    </div>
                </div>
            </div>
            <div className="profile-stats">
                <div className="profile-stat" onClick={() => setProfileTab('favorites')}><div className="profile-stat-num">{favorites.length}</div><div className="profile-stat-label">Избранное</div></div>
                <div className="profile-stat" onClick={() => setProfileTab('history')}><div className="profile-stat-num">{history.length}</div><div className="profile-stat-label">Просмотрено</div></div>
                <div className="profile-stat" onClick={() => setProfileTab('reviews')}><div className="profile-stat-num">{reviews.length}</div><div className="profile-stat-label">Отзывы</div></div>
                <div className="profile-stat" onClick={() => setProfileTab('friends')}><div className="profile-stat-num">{friends.length}</div><div className="profile-stat-label">Друзья</div></div>
            </div>
        </>
    );
});

export default ProfileHeader;
