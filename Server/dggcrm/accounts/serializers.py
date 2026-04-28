from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import serializers

from .models import DiscordID, UserPreferences

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
    discord_ids = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "groups",
            "primary_email",
            "discord_ids",
            "is_superuser",
            "is_active",
        ]

    def get_groups(self, user):
        return list(user.groups.values_list("name", flat=True))

    def get_primary_email(self, user):
        email = EmailAddress.objects.filter(user=user, primary=True).first()
        return email.email if email else ""

    def get_discord_ids(self, user):
        return list(
            DiscordID.objects.filter(user=user).values(
                "id",
                "discord_id",
                "active",
            )
        )


class DiscordIDSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
    )

    class Meta:
        model = DiscordID
        fields = ["id", "user", "discord_id", "active"]

    def validate_discord_id(self, value):
        instance = self.instance
        if instance and instance.discord_id == value:
            return value
        if DiscordID.objects.filter(discord_id=value).exists():
            raise serializers.ValidationError("This Discord ID is already in use.")
        return value


class UserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, default="")
    last_name = serializers.CharField(max_length=150, required=False, default="")
    groups = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    discord_id = serializers.CharField(max_length=64, required=False, default="")

    def validate_username(self, value):
        if not value:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if value and EmailAddress.objects.filter(email=value).exists():
            raise serializers.ValidationError({"detail": ["This email is already in use."]})
        return value

    def validate_discord_id(self, value):
        if value and DiscordID.objects.filter(discord_id=value).exists():
            raise serializers.ValidationError({"detail": ["This Discord ID is already in use."]})
        return value

    def validate(self, attrs):
        email = attrs.get("email", "")
        discord_id = attrs.get("discord_id", "")
        if not email and not discord_id:
            raise serializers.ValidationError(
                {"detail": ["Either email or Discord ID is required for authentication."]}
            )
        return attrs

    def create(self, validated_data):
        groups = validated_data.pop("groups", [])
        discord_id = validated_data.pop("discord_id", "")
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

        if discord_id:
            DiscordID.objects.create(
                user=user,
                discord_id=discord_id,
                active=True,
            )

        for group_name in groups:
            try:
                group = Group.objects.get(name=group_name)
                user.groups.add(group)
            except Group.DoesNotExist:
                pass

        return user


class UpdateUserSerializer(serializers.Serializer):
    groups = serializers.ListField(child=serializers.CharField(), required=False, default=None)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    discord_id = serializers.CharField(max_length=64, required=False, allow_blank=True, allow_null=True)

    def validate_email(self, value):
        if value:
            existing = EmailAddress.objects.filter(email=value)
            if self.instance and existing.exclude(user=self.instance).exists():
                raise serializers.ValidationError({"detail": ["This email is already in use."]})
            elif not self.instance and existing.exists():
                raise serializers.ValidationError({"detail": ["This email is already in use."]})
        return value

    def validate_discord_id(self, value):
        if value:
            existing = DiscordID.objects.filter(discord_id=value)
            if self.instance:
                existing = existing.exclude(user=self.instance)
            if existing.exists():
                raise serializers.ValidationError({"detail": ["This Discord ID is already in use."]})
        return value

    def validate(self, attrs):
        if not self.instance:
            email = attrs.get("email", "")
            discord_id = attrs.get("discord_id", "")
            if not email and not discord_id:
                raise serializers.ValidationError(
                    {"detail": ["Either email or Discord ID is required for authentication."]}
                )
        return attrs
