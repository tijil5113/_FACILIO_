from facilio.core.filenames import display_stem, original_filename


def test_original_filename_strips_paths() -> None:
    assert original_filename("../../etc/passwd.csv") == "passwd.csv"
    assert original_filename("") == "upload"
    assert original_filename("..") == "upload"


def test_display_stem() -> None:
    assert display_stem("customers.csv") == "customers"
    assert display_stem("archive") == "archive"
