from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from rest_framework import serializers

User = get_user_model()


class UserDetailsSerializer(serializers.ModelSerializer):
    email_addresses = serializers.SerializerMethodField()
    social_accounts = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "email_addresses", "social_accounts"]

    def get_email_addresses(self, user):
        return list(
            EmailAddress.objects.filter(user=user).values(
                "email",
                "primary",
                "verified",
            )
        )

    def get_social_accounts(self, user):
        return [
            {
                "provider": sa.provider,
                "uid": sa.uid,
                "last_login": sa.last_login,
            }
            for sa in SocialAccount.objects.filter(user=user)
        ]


class SocialAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialAccount
        fields = ["id", "provider", "uid"]
