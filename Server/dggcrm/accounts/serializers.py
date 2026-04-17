from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
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


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


class ManagedUserSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    primary_email = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "groups", "primary_email", "is_superuser", "is_active"]

    def get_groups(self, user):
        return list(user.groups.values_list("name", flat=True))

    def get_primary_email(self, user):
        email = EmailAddress.objects.filter(user=user, primary=True).first()
        return email.email if email else ""


class UserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, default="")
    last_name = serializers.CharField(max_length=150, required=False, default="")
    groups = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def validate_username(self, value):
        if not value:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email is required.")
        if EmailAddress.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def create(self, validated_data):
        groups = validated_data.pop("groups", [])
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )

        if validated_data.get("email"):
            EmailAddress.objects.create(
                user=user,
                email=validated_data["email"],
                primary=True,
                verified=True,
            )

        for group_name in groups:
            try:
                group = Group.objects.get(name=group_name)
                user.groups.add(group)
            except Group.DoesNotExist:
                pass

        return user


class UpdateUserSerializer(serializers.Serializer):
    groups = serializers.ListField(child=serializers.CharField(), required=False, default=list)
