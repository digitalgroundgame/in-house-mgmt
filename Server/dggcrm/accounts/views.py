from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import filters, generics, mixins, permissions, status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from config.pagination import StandardPagination
from dggcrm.discord.permissions import DISCORD_BOT_GROUP

from .models import DiscordID, UserPreferences
from .serializers import (
    DiscordIDSerializer,
    GroupSerializer,
    ManagedUserSerializer,
    SocialAccountSerializer,
    UpdateUserSerializer,
    UserDetailsSerializer,
    UserPreferencesSerializer,
    UserSearchSerializer,
    UserSerializer,
)


class UserSearchView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSearchSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name"]

    def get_queryset(self):
        return self.serializer_class.Meta.model.objects.all()


class SocialConnectionDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SocialAccountSerializer
    lookup_field = "provider"

    def get_queryset(self):
        return SocialAccount.objects.filter(user=self.request.user)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserDetailsSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserDetailsSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        serializer = UserPreferencesSerializer(
            preferences,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class GroupListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = GroupSerializer
    queryset = Group.objects.exclude(name=DISCORD_BOT_GROUP).order_by("name")
    pagination_class = None


class ManagedUserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    GenericViewSet,
):
    permission_classes = [IsAdminUser]
    serializer_class = ManagedUserSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["username", "first_name", "last_name"]
    ordering_fields = ["username", "first_name", "last_name"]
    ordering = ["username"]

    def get_queryset(self):
        User = get_user_model()
        return User.objects.all().order_by("username").prefetch_related("discord_ids")

    def get_serializer_class(self):
        if self.action == "create":
            return UserSerializer
        if self.action in ["partial_update", "update"]:
            return UpdateUserSerializer
        return ManagedUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            ManagedUserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = UpdateUserSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_email = serializer.validated_data.get("email")
        if "email" in request.data:
            has_discord = DiscordID.objects.filter(user=instance).exists()
            if not has_discord and (new_email is None or new_email == ""):
                return Response(
                    {"detail": ["Cannot remove email. User would have no authentication method."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            instance.email = new_email if new_email else ""
            instance.save(update_fields=["email"])
            EmailAddress.objects.filter(user=instance, primary=True).delete()
            if new_email:
                EmailAddress.objects.create(
                    user=instance,
                    email=new_email,
                    primary=True,
                    verified=True,
                )

        new_discord_id = serializer.validated_data.get("discord_id")
        if "discord_id" in request.data:
            has_email = EmailAddress.objects.filter(user=instance, primary=True).exists()
            if not has_email and (new_discord_id is None or new_discord_id.strip() == ""):
                return Response(
                    {"detail": ["Cannot remove Discord ID. User would have no authentication method."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            DiscordID.objects.filter(user=instance).delete()
            if new_discord_id.strip():
                DiscordID.objects.create(
                    user=instance,
                    discord_id=new_discord_id.strip(),
                    active=True,
                )

        groups = serializer.validated_data.get("groups")
        if groups is not None:
            instance.groups.clear()
            for group_name in groups:
                try:
                    group = Group.objects.get(name=group_name)
                    instance.groups.add(group)
                except Group.DoesNotExist:
                    pass

        return Response(ManagedUserSerializer(instance).data, status=status.HTTP_200_OK)


class ToggleUserActiveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk=None):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.id == request.user.id:
            return Response(
                {"detail": "You cannot disable yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])

        return Response(
            {"id": user.id, "username": user.username, "is_active": user.is_active},
            status=status.HTTP_200_OK,
        )


class DiscordIDViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    GenericViewSet,
):
    permission_classes = [IsAdminUser]
    serializer_class = DiscordIDSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        user_id = self.request.query_params.get("user")
        if user_id:
            return DiscordID.objects.filter(user_id=user_id)
        return DiscordID.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = instance.user
        has_email = EmailAddress.objects.filter(user=user, primary=True).exists()
        has_other_discord = DiscordID.objects.filter(user=user).exclude(pk=instance.pk).exists()
        if not has_email and not has_other_discord:
            return Response(
                {"detail": ["Cannot remove Discord ID. User would have no authentication method."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
