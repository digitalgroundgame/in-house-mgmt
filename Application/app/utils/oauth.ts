import getCookie from '@/app/utils/cookie';

const IS_LOCAL = process.env.NEXT_PUBLIC_USE_MOCK_OAUTH === "true";

export const OAUTH_PROVIDERS = {
  google: IS_LOCAL ? "mock-google" : "google",
  discord: IS_LOCAL ? "mock-discord" : "discord",
};

type Provider = keyof typeof OAUTH_PROVIDERS;

export const loginWithProvider = (provider: Provider, next?: string) => {
  console.log(process.env.NEXT_PUBLIC_USE_MOCK_OAUTH);
  const providerId = OAUTH_PROVIDERS[provider];

  const nextParam = next ? `?next=${encodeURIComponent(next)}` : "";

  window.location.href = `/accounts/${providerId}/login/${nextParam}`;
};

export const handleLogout = async (event: React.MouseEvent) => {
  event.preventDefault();
  const csrfToken = getCookie('csrftoken');

  try {
    const res = await fetch('/accounts/logout/', {
      method: 'POST',
      credentials: 'include', // send cookies
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken || '',
      },
    });

    if (res.ok) {
      window.location.href = `/login`;
    } else {
      alert('Logout failed');
    }
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed');
  }
};