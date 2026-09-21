import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).parents[1]
LINT = ROOT / "skills/obsidian-vault-assistant/tools/lint.py"


class TaskV2LintTest(unittest.TestCase):
    def run_lint(self, notes, symlink=False):
        with tempfile.TemporaryDirectory() as tmp:
            vault = Path(tmp)
            (vault / "Tasks").mkdir()
            for name, frontmatter in notes.items():
                (vault / "Tasks" / name).write_text(
                    "---\n" + frontmatter.strip() + "\n---\nBody.\n", encoding="utf-8"
                )
            if symlink:
                (vault / "Tasks" / "linked.md").symlink_to(vault / "Tasks" / next(iter(notes)))
            return subprocess.run(
                ["python3", str(LINT), str(vault)], text=True, capture_output=True
            )

    def valid(self, **overrides):
        values = {
            "type": "Task",
            "schema_version": "2",
            "id": '"12345678-1234-4234-8234-123456789abc"',
            "title": "Research — Test task",
            "status": "available",
            "created": "2026-09-17",
        }
        values.update(overrides)
        return "\n".join(f"{key}: {value}" for key, value in values.items())

    def test_valid_minimal_available_task(self):
        result = self.run_lint({"Research — Test task.md": self.valid()})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_rejects_legacy_fields_and_duplicate_ids(self):
        note = self.valid(completed="false", review_after="2026-09-30")
        result = self.run_lint({"Research — Test task.md": note, "Duplicate.md": note})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("legacy field 'completed'", result.stdout)
        self.assertIn("legacy field 'review_after'", result.stdout)
        self.assertIn("duplicate task id", result.stdout)

    def test_committed_requires_commitment_fields(self):
        result = self.run_lint({"Research — Test task.md": self.valid(status="committed")})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("committed_at", result.stdout)
        self.assertIn("commitment_cycle", result.stdout)

    def test_migrated_committed_revision_required_is_informational(self):
        note = self.valid(status="committed", revision_required="true")
        result = self.run_lint({"Research — Test task.md": note})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("revision_required", result.stdout)

    def test_nullable_created_is_allowed(self):
        result = self.run_lint({"Research — Test task.md": self.valid(created="")})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_title_filename_mismatch_and_symlink_are_hard(self):
        result = self.run_lint({"Wrong.md": self.valid()}, symlink=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("title diverges from filename", result.stdout)
        self.assertIn("symlink", result.stdout)


if __name__ == "__main__":
    unittest.main()
