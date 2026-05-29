#!/bin/bash

# Script to clean up auto-generated test fixtures created by CatalogManager
# These files are created during test runs and can be useful for debugging,
# but should not be committed to the repository.
#
# Usage:
#   ./scripts/clean-test-fixtures.sh
#
# To preserve fixtures for debugging, set PRESERVE_TEST_FIXTURES=1:
#   PRESERVE_TEST_FIXTURES=1 yarn test

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"
FIXTURES_DIR="$CLI_DIR/test/fixtures/catalog/soc"

# Check if cleanup should be skipped
if [ "${PRESERVE_TEST_FIXTURES:-0}" = "1" ]; then
  echo "PRESERVE_TEST_FIXTURES is set - skipping cleanup"
  exit 0
fi

echo "Cleaning up auto-generated test fixtures..."

# Remove the entire catalog/soc/db directory (auto-generated from backup ZIP)
CATALOG_DB="$FIXTURES_DIR/db"
if [ -d "$CATALOG_DB" ]; then
  rm -rf "$CATALOG_DB"
  echo "  ✓ Removed catalog/soc/db directory (auto-generated from backup)"
else
  echo "  ℹ Catalog db directory not found: $CATALOG_DB"
fi

# Remove CatalogManager temporary directories
find "${CLI_DIR}/test/fixtures/catalog" -type d -name 'db.*.tmp' -exec rm -rf {} + 2>/dev/null || true
echo "  ✓ Cleaned up any db.*.tmp temporary directories"

echo "Cleanup complete!"
