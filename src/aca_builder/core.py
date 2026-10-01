# Deprecated Core Facade
# This file ensures backward compatibility for tests importing 'aca_builder.core'
# while logic has moved to domain/infra services.

from .domain.services import (
    evaluate_lookup as _eval,
)
from .domain.services import (
    resolve_dependencies as _resolve,
)
from .domain.services import (
    resolve_lookup_by_key as _resolve_key,
)
from .domain.services import (
    select_atoms_by_query as _select,
)
from .domain.services import (
    serialize_prompt as _serialize,
)
from .infra.filesystem import FSLibraryRepository as _Repo

_repo = _Repo()


def parse_atom(file_path, package_name=None):
    return _repo._parse_atom(file_path, package_name)


def load_library(library_paths, errors=None, fail_fast=True):
    return _repo.load_library(library_paths, fail_fast=fail_fast, errors=errors)


def load_interfaces(library_paths):
    return _repo.load_interfaces(library_paths)


def select_atoms_by_query(library, query):
    return _select(library, query)


def evaluate_lookup(library, lookup_def, interfaces, visited=None):
    return _eval(library, lookup_def, interfaces, visited=visited)


def _resolve_lookup_by_key(ref_key, context_pkg, interfaces):
    return _resolve_key(ref_key, context_pkg, interfaces)


def resolve_dependencies(initial_map, library, interfaces):
    return _resolve(initial_map, library, interfaces)


def serialize_prompt(atom_lookup_map, library):
    return _serialize(atom_lookup_map, library)
