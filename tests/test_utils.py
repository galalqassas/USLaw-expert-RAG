"""Tests for utility functions."""

from law_rag.utils import clean_html_text


class TestCleanHtmlText:
    """Tests for clean_html_text function."""

    def test_strips_html_tags(self):
        assert clean_html_text("<p>Hello</p>") == "Hello"

    def test_removes_script_and_style(self):
        html = "<script>alert(1)</script><style>.x{}</style><p>Text</p>"
        assert clean_html_text(html) == "Text"

    def test_normalizes_whitespace(self):
        html = "<p>Multiple    spaces</p>\n\n<p>and newlines</p>"
        result = clean_html_text(html)
        assert "  " not in result and "\n" not in result

    def test_handles_empty_input(self):
        assert clean_html_text("") == ""
