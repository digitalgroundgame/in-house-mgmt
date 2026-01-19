from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.adapter import DefaultAccountAdapter
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from django.core.exceptions import PermissionDenied

class SocialLoginForbidden(Exception):
    """Raised when a social login is not allowed (non-existing user)."""
    def __init__(self, email=None):
        self.email = email
        super().__init__(f"Social login blocked for {email}")

class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        """
        Only allow social login for users that already exist.
        Match against ANY verified email on the account.
        """
        if sociallogin.is_existing:
            return

        email = sociallogin.account.extra_data.get("email")
        if not email:
            request.session.flush()
            raise ImmediateHttpResponse(
                redirect("/login?social_error=no_email")
            )

        # First check user table's email, then check EmailAddress table
        User = get_user_model()
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
        else:
            try:
                email_address = EmailAddress.objects.select_related("user").get(
                    email__iexact=email,
                    verified=True,
                )
                user = email_address.user
            except EmailAddress.DoesNotExist:
                # No verified email anywhere in the system
                request.session.flush()
                raise ImmediateHttpResponse(
                    redirect(f"/login?social_error=no_user&email={email}")
                )

        # Link this social account to the owning user
        sociallogin.connect(request, user)

    def is_open_for_signup(self, request, sociallogin):
        # No signups
        request.session.flush()
        return False

    def on_authentication_error(self, request, provider_id, error=None, exception=None, extra_context=None):
        # Always redirect failed logins to /login with params
        email = getattr(exception, 'email', '')
        request.session.flush()
        return ImmediateHttpResponse(redirect(f'/login?social_error=no_user&email={email}'))


class NoNewUsersAccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request):
        return False

    def on_authentication_error(self, request, provider_id, error=None, exception=None, extra_context=None):
        # Always redirect failed logins to /login with params
        email = getattr(exception, 'email', '')
        return ImmediateHttpResponse(redirect(f'/login?social_error=no_user&email={email}'))
