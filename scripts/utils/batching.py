from itertools import islice
from typing import Iterable, Iterator, TypeVar

T = TypeVar("T")


def batched(items: Iterable[T], n: int) -> Iterator[list[T]]:
    """Découpe un itérable en batches de taille n (le dernier peut être plus court)."""
    it = iter(items)
    while batch := list(islice(it, n)):
        yield batch
