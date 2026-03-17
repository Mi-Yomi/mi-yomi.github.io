import { useApp } from '../../context/AppContext.jsx';

export default function PendingScreen() {
  const {
    userProfile,
    refreshApprovalStatus,
    refreshingStatus,
    handleLogout,
  } = useApp();

  const status = userProfile?.status || 'pending';
  const isPending = status === 'pending' || !status;
  const isRejected = status === 'rejected';

  return (
    <div className="pending-screen fade-in">
      <div className="pending-icon">{isPending ? '⏳' : '🚫'}</div>
      <h1 className="pending-title">{isPending ? 'Заявка на рассмотрении' : 'Доступ запрещён'}</h1>
      <div className={`pending-status ${isPending ? 'waiting' : 'rejected'}`}>
        {isPending ? '🔄 Ожидание проверки' : '❌ Заявка отклонена'}
      </div>
      <p className="pending-text">
        {isPending
          ? 'Ваша заявка отправлена администратору. После подтверждения вы получите полный доступ к Cinema HADES.'
          : 'К сожалению, ваша заявка была отклонена. Если вы считаете это ошибкой, свяжитесь с администрацией.'}
      </p>
      {userProfile?.email && (
        <div className="pending-email">{userProfile.email}</div>
      )}
      <button className="pending-refresh" onClick={refreshApprovalStatus} disabled={refreshingStatus}>
        {refreshingStatus ? 'Проверяю...' : '🔄 Обновить статус'}
      </button>
      <button className="pending-logout" onClick={handleLogout}>
        Выйти из аккаунта
      </button>
    </div>
  );
}
