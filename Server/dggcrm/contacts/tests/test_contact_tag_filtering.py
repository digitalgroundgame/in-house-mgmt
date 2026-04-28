import pytest
from rest_framework.test import APIClient

from dggcrm.contacts.models import TagAssignments


@pytest.fixture
def client(admin_user):
    c = APIClient()
    c.force_authenticate(admin_user)
    return c


@pytest.fixture
def tagged_contacts(contact, contact_b, contact_c, tag, tag_b, tag_c):
    """
    contact  → tag, tag_b
    contact_b → tag
    contact_c → tag_b, tag_c
    """
    TagAssignments.objects.create(contact=contact, tag=tag)
    TagAssignments.objects.create(contact=contact, tag=tag_b)
    TagAssignments.objects.create(contact=contact_b, tag=tag)
    TagAssignments.objects.create(contact=contact_c, tag=tag_b)
    TagAssignments.objects.create(contact=contact_c, tag=tag_c)
    return contact, contact_b, contact_c


@pytest.mark.django_db
class TestContactTagFiltering:
    def test_no_tag_filter_returns_all(self, client, tagged_contacts):
        resp = client.get("/api/contacts/")
        assert resp.status_code == 200
        assert resp.data["count"] == 3

    def test_single_tag(self, client, tagged_contacts, tag):
        resp = client.get(f"/api/contacts/?tag_ids={tag.id}")
        assert resp.status_code == 200
        ids = {c["id"] for c in resp.data["results"]}
        contact, contact_b, _ = tagged_contacts
        assert ids == {contact.id, contact_b.id}

    def test_multiple_tags_any_mode(self, client, tagged_contacts, tag, tag_c):
        resp = client.get(f"/api/contacts/?tag_ids={tag.id},{tag_c.id}&tag_mode=any")
        assert resp.status_code == 200
        ids = {c["id"] for c in resp.data["results"]}
        contact, contact_b, contact_c = tagged_contacts
        assert ids == {contact.id, contact_b.id, contact_c.id}

    def test_multiple_tags_all_mode(self, client, tagged_contacts, tag, tag_b):
        resp = client.get(f"/api/contacts/?tag_ids={tag.id},{tag_b.id}&tag_mode=all")
        assert resp.status_code == 200
        ids = {c["id"] for c in resp.data["results"]}
        contact, _, _ = tagged_contacts
        assert ids == {contact.id}

    def test_default_mode_is_any(self, client, tagged_contacts, tag, tag_c):
        resp = client.get(f"/api/contacts/?tag_ids={tag.id},{tag_c.id}")
        assert resp.status_code == 200
        ids = {c["id"] for c in resp.data["results"]}
        contact, contact_b, contact_c = tagged_contacts
        assert ids == {contact.id, contact_b.id, contact_c.id}

    def test_all_mode_no_overlap_returns_empty(self, client, tagged_contacts, tag, tag_c):
        resp = client.get(f"/api/contacts/?tag_ids={tag.id},{tag_c.id}&tag_mode=all")
        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_invalid_tag_ids_ignored(self, client, tagged_contacts, tag):
        resp = client.get(f"/api/contacts/?tag_ids=abc,{tag.id},,xyz")
        assert resp.status_code == 200
        ids = {c["id"] for c in resp.data["results"]}
        contact, contact_b, _ = tagged_contacts
        assert ids == {contact.id, contact_b.id}
