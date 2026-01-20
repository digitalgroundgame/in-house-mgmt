from django.db import models

class Contact(models.Model):
    """
    Represents a task that must be accomplished by a user.
    Tasks might be introductions, recruitments, etc.
    They also may track tasks that must be accomplished for events.
    """
    id = models.AutoField(primary_key=True)

    full_name = models.CharField(max_length=200, blank=True)

    discord_id = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)

    note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'contacts'

    def __str__(self):
        if self.full_name:
            return self.full_name
        elif self.discord_id:
            return self.discord_id

        return self.id

class Tag(models.Model):
    id = models.AutoField(primary_key=True)

    name = models.CharField(max_length=64, unique=True)

    # TODO: Rethink colors? Color enum?
    color = models.CharField(max_length=7, default="#9e9e9e")

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tags'

    def __str__(self):
        return f"{self.name}"


class TagAssignments(models.Model):
    """
    Application of a tag to a person by an organization.
    """

    id = models.AutoField(primary_key=True)

    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name="taggings",
    )

    tag = models.ForeignKey(
        Tag,
        on_delete=models.CASCADE,
        related_name="taggings",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tag_assignments'
        unique_together = [("contact", "tag")]
        indexes = [
            models.Index(fields=["contact"]),
            models.Index(fields=["tag"]),
        ]

    def __str__(self):
        return f"{self.tag.name}"

# TODO: implement missing tables from DB diagram
