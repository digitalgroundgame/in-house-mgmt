from allauth.socialaccount.models import SocialAccount
from rest_framework import filters, generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.pagination import StandardPagination

from .models import UserPreferences
from .serializers import SocialAccountSerializer, UserDetailsSerializer, UserPreferencesSerializer, UserSearchSerializer


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
