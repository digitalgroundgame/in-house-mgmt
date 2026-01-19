from .serializers import SocialAccountSerializer, UserDetailsSerializer
from rest_framework import generics, permissions, status
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

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