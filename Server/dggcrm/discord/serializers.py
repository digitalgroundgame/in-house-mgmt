from rest_framework import serializers

from dggcrm.events.models import CommitmentStatus

# Single-element for now: bot only tracks physical presence. Kept as a list so
# NO_SHOW can be added back when/if bot wires up RSVP-diff support.
ALLOWED_ATTENDANCE_STATUSES = [
    CommitmentStatus.ATTENDED,
]


class AttendanceParticipantSerializer(serializers.Serializer):
    discord_id = serializers.CharField(max_length=64)
    discord_name = serializers.CharField(max_length=100)
    status = serializers.ChoiceField(choices=ALLOWED_ATTENDANCE_STATUSES)


class RecordAttendanceSerializer(serializers.Serializer):
    event_id = serializers.CharField(max_length=64)
    event_name = serializers.CharField(max_length=100)
    event_tracker_discord_id = serializers.CharField(max_length=64)
    participants = AttendanceParticipantSerializer(many=True)

    def validate_participants(self, value):
        seen_ids = set()
        for participant in value:
            discord_id = participant["discord_id"]
            if discord_id in seen_ids:
                raise serializers.ValidationError(f"Duplicate discord_id in participants: {discord_id}")
            seen_ids.add(discord_id)
        return value
