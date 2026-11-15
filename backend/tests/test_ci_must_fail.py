"""THROWAWAY (#62): a deliberately failing test to prove CI blocks the merge. Never merged."""


def test_ci_blocks_merge_when_a_test_fails() -> None:
    assert 1 + 1 == 3
