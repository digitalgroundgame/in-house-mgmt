from django.test import TestCase
from rest_framework.test import APIClient

from .models import Contact, Tag, TagAssignments


class ContactTagFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.alpha = Tag.objects.create(name="alpha", color="#111111")
        self.beta = Tag.objects.create(name="beta", color="#222222")

        self.contact_alpha = Contact.objects.create(
            full_name="Alpha Only",
            discord_id="alpha-only",
        )
        self.contact_beta = Contact.objects.create(
            full_name="Beta Only",
            discord_id="beta-only",
        )
        self.contact_both = Contact.objects.create(
            full_name="Both Tags",
            discord_id="both-tags",
        )
        self.contact_none = Contact.objects.create(
            full_name="No Tags",
            discord_id="no-tags",
        )

        TagAssignments.objects.create(contact=self.contact_alpha, tag=self.alpha)
        TagAssignments.objects.create(contact=self.contact_beta, tag=self.beta)
        TagAssignments.objects.create(contact=self.contact_both, tag=self.alpha)
        TagAssignments.objects.create(contact=self.contact_both, tag=self.beta)

    def get_results(self, response):
        self.assertEqual(response.status_code, 200)
        return response.json()["results"]

    def get_result_ids(self, response):
        return [item["id"] for item in self.get_results(response)]

    def test_list_contacts_without_tag_filter_returns_all_contacts(self):
        response = self.client.get("/api/contacts/")

        self.assertCountEqual(
            self.get_result_ids(response),
            [
                self.contact_alpha.id,
                self.contact_beta.id,
                self.contact_both.id,
                self.contact_none.id,
            ],
        )

    def test_single_numeric_tag_filter_preserves_existing_behavior(self):
        response = self.client.get(f"/api/contacts/?tag={self.alpha.id}")

        self.assertCountEqual(
            self.get_result_ids(response),
            [self.contact_alpha.id, self.contact_both.id],
        )

    def test_single_tag_name_preserves_existing_behavior(self):
        response = self.client.get("/api/contacts/?tag=alpha")

        self.assertCountEqual(
            self.get_result_ids(response),
            [self.contact_alpha.id, self.contact_both.id],
        )

    def test_repeated_tag_filters_match_any_selected_tag_once(self):
        response = self.client.get(
            f"/api/contacts/?tag={self.alpha.id}&tag={self.beta.id}"
        )

        result_ids = self.get_result_ids(response)

        self.assertCountEqual(
            result_ids,
            [self.contact_alpha.id, self.contact_beta.id, self.contact_both.id],
        )
        self.assertEqual(len(result_ids), len(set(result_ids)))

    def test_repeated_tag_filters_ignore_invalid_values_without_erroring(self):
        response = self.client.get(
            f"/api/contacts/?tag={self.alpha.id}&tag=does-not-exist"
        )

        self.assertCountEqual(
            self.get_result_ids(response),
            [self.contact_alpha.id, self.contact_both.id],
        )

    def test_invalid_tag_values_return_empty_results(self):
        response = self.client.get("/api/contacts/?tag=does-not-exist")

        self.assertEqual(self.get_result_ids(response), [])

    def test_contacts_list_serializes_assigned_tags(self):
        response = self.client.get("/api/contacts/")

        contact_alpha = next(
            item for item in self.get_results(response)
            if item["id"] == self.contact_alpha.id
        )

        self.assertEqual(
            contact_alpha["tags"],
            [
                {
                    "id": self.alpha.id,
                    "name": self.alpha.name,
                    "color": self.alpha.color,
                }
            ],
        )
