from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserPreferences

User = get_user_model()


class UserDetailsSerializer(serializers.ModelSerializer):
    email_addresses = serializers.SerializerMethodField()
    social_accounts = serializers.SerializerMethodField()
    groups = serializers.SerializerMethodField()
    timezone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "groups",
            "email_addresses",
            "social_accounts",
            "timezone",
        ]

    def get_timezone(self, user):
        try:
            return user.preferences.timezone
        except UserPreferences.DoesNotExist:
            return ""

    def get_groups(self, user):
        groups = list(user.groups.values_list("name", flat=True))

        if user.is_superuser:
            groups += ["ADMIN"]

        return groups

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


class UserSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class SocialAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialAccount
        fields = ["id", "provider", "uid"]


class UserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferences
        fields = ["timezone"]
