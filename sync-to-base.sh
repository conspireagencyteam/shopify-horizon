#!/bin/bash
# sync-to-base.sh - Sync 1- prefixed customizations to agency base theme
#
# Usage: Run from client project directory
#   ../agency-base-theme/sync-to-base.sh
#   OR
#   ./sync-to-base.sh ../agency-base-theme
#
# What gets synced:
#   - sections/1-*     → Copy to base (merges presets - adds new, keeps existing)
#   - blocks/1-*       → Copy to base (merges presets - adds new, keeps existing)
#   - snippets/1-*     → Copy to base
#   - assets/1-*       → NEW files only (won't overwrite existing)
#   - .cursor/rules/   → NOT synced (project manages own rules)
#
# What does NOT get synced:
#   - templates/       → Project-specific
#   - config/          → Project-specific
#   - locales/         → Manual merge (see instructions below)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine base theme directory
if [ -n "$1" ]; then
    BASE_DIR="$1"
elif [ -d "../agency-base-theme" ]; then
    BASE_DIR="../agency-base-theme"
else
    echo -e "${RED}Error: Cannot find agency-base-theme directory${NC}"
    echo ""
    echo "Usage:"
    echo "  ./sync-to-base.sh <path-to-base-theme>"
    echo "  OR ensure ../agency-base-theme exists"
    exit 1
fi

PROJECT_DIR="."

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Agency Base Theme Sync Tool${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "Project: ${GREEN}$(basename "$(pwd)")${NC}"
echo -e "Base:    ${GREEN}$BASE_DIR${NC}"
echo ""

# Verify base directory exists
if [ ! -d "$BASE_DIR" ]; then
    echo -e "${RED}Error: Base theme directory not found: $BASE_DIR${NC}"
    exit 1
fi

# Track what was synced
SYNCED_COUNT=0

# Check if jq is available (needed for preset merging)
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Warning: jq is not installed. Preset merging will be skipped.${NC}"
    echo -e "${YELLOW}Install with: brew install jq${NC}"
    echo ""
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

# Function to extract schema JSON from a liquid file
extract_schema() {
    local file=$1
    # Extract content between {% schema %} and {% endschema %}
    sed -n '/{% schema %}/,/{% endschema %}/p' "$file" | sed '1d;$d'
}

# Function to merge presets from two schema JSONs
# Returns the source schema with merged presets (base presets + new source presets)
merge_presets() {
    local source_schema=$1
    local base_schema=$2

    # Get preset names from base
    local base_preset_names=$(echo "$base_schema" | jq -r '.presets[]?.name // empty' 2>/dev/null | sort -u)

    # Get presets from both
    local base_presets=$(echo "$base_schema" | jq '.presets // []' 2>/dev/null)
    local source_presets=$(echo "$source_schema" | jq '.presets // []' 2>/dev/null)

    # Find new presets in source (not in base by name)
    local new_presets="[]"
    while IFS= read -r preset; do
        [ -z "$preset" ] && continue
        local preset_name=$(echo "$preset" | jq -r '.name // empty')
        if [ -n "$preset_name" ] && ! echo "$base_preset_names" | grep -qxF "$preset_name"; then
            new_presets=$(echo "$new_presets" | jq --argjson p "$preset" '. + [$p]')
        fi
    done < <(echo "$source_presets" | jq -c '.[]' 2>/dev/null)

    # Merge: base presets + new presets
    local merged_presets=$(echo "$base_presets" | jq --argjson new "$new_presets" '. + $new')

    # Return source schema with merged presets
    echo "$source_schema" | jq --argjson presets "$merged_presets" '.presets = $presets'
}

# Function to sync with preset merging (for sections/blocks)
sync_folder_with_preset_merge() {
    local folder=$1
    local count=0
    local merged_count=0

    if [ -d "$PROJECT_DIR/$folder" ]; then
        mkdir -p "$BASE_DIR/$folder"

        while IFS= read -r -d '' file; do
            local filename=$(basename "$file")
            local target="$BASE_DIR/$folder/$filename"

            if [ -f "$target" ] && [ "$JQ_AVAILABLE" = true ]; then
                # File exists in base - need to merge presets
                local source_schema=$(extract_schema "$file")
                local base_schema=$(extract_schema "$target")

                # Check if both have valid schemas
                if [ -n "$source_schema" ] && [ -n "$base_schema" ]; then
                    # Merge presets
                    local merged_schema=$(merge_presets "$source_schema" "$base_schema")

                    if [ -n "$merged_schema" ] && [ "$merged_schema" != "null" ]; then
                        # Copy file first
                        cp "$file" "$target"

                        # Replace schema in target with merged schema
                        # Create temp file with merged content
                        local temp_file=$(mktemp)
                        local before_schema=$(sed -n '1,/{% schema %}/p' "$file" | head -n -1)
                        local after_schema=$(sed -n '/{% endschema %}/,$p' "$file" | tail -n +2)

                        {
                            echo "$before_schema"
                            echo "{% schema %}"
                            echo "$merged_schema" | jq '.'
                            echo "{% endschema %}"
                            echo "$after_schema"
                        } > "$temp_file"

                        mv "$temp_file" "$target"
                        ((merged_count++))
                    else
                        # Fallback to simple copy if merge fails
                        cp "$file" "$target"
                    fi
                else
                    # No schema to merge, just copy
                    cp "$file" "$target"
                fi
            else
                # New file or jq not available - just copy
                cp "$file" "$target"
            fi

            ((count++))
            ((SYNCED_COUNT++))
        done < <(find "$PROJECT_DIR/$folder" -maxdepth 1 -name "1-*" -print0 2>/dev/null)

        if [ $count -gt 0 ]; then
            if [ $merged_count -gt 0 ]; then
                echo -e "${GREEN}✓${NC} Synced $folder/ (${count} files, ${merged_count} with preset merge)"
            else
                echo -e "${GREEN}✓${NC} Synced $folder/ (${count} files)"
            fi
        else
            echo -e "${YELLOW}○${NC} No 1- files in $folder/"
        fi
    else
        echo -e "${YELLOW}○${NC} Folder $folder/ not found"
    fi
}

# Function to sync 1- prefixed files from a folder (overwrites existing)
sync_folder() {
    local folder=$1
    local count=0

    if [ -d "$PROJECT_DIR/$folder" ]; then
        # Create target directory if it doesn't exist
        mkdir -p "$BASE_DIR/$folder"

        # Find and copy all 1- prefixed files
        while IFS= read -r -d '' file; do
            cp "$file" "$BASE_DIR/$folder/"
            ((count++))
            ((SYNCED_COUNT++))
        done < <(find "$PROJECT_DIR/$folder" -maxdepth 1 -name "1-*" -print0 2>/dev/null)

        if [ $count -gt 0 ]; then
            echo -e "${GREEN}✓${NC} Synced $folder/ (${count} files)"
        else
            echo -e "${YELLOW}○${NC} No 1- files in $folder/"
        fi
    else
        echo -e "${YELLOW}○${NC} Folder $folder/ not found"
    fi
}

# Function to sync ONLY NEW 1- prefixed files (won't overwrite existing)
sync_folder_new_only() {
    local folder=$1
    local new_count=0
    local skipped_count=0

    if [ -d "$PROJECT_DIR/$folder" ]; then
        # Create target directory if it doesn't exist
        mkdir -p "$BASE_DIR/$folder"

        # Find all 1- prefixed files
        while IFS= read -r -d '' file; do
            local filename=$(basename "$file")
            local target="$BASE_DIR/$folder/$filename"

            # Only copy if file doesn't exist in base
            if [ ! -f "$target" ]; then
                cp "$file" "$target"
                ((new_count++))
                ((SYNCED_COUNT++))
            else
                ((skipped_count++))
            fi
        done < <(find "$PROJECT_DIR/$folder" -maxdepth 1 -name "1-*" -print0 2>/dev/null)

        if [ $new_count -gt 0 ] || [ $skipped_count -gt 0 ]; then
            echo -e "${GREEN}✓${NC} Synced $folder/ (${new_count} new, ${skipped_count} skipped existing)"
        else
            echo -e "${YELLOW}○${NC} No 1- files in $folder/"
        fi
    else
        echo -e "${YELLOW}○${NC} Folder $folder/ not found"
    fi
}

# Sync all 1- prefixed folders
echo -e "${BLUE}Syncing 1- prefixed files...${NC}"
echo ""
sync_folder_with_preset_merge "sections"  # Merge presets (keep base + add new)
sync_folder_with_preset_merge "blocks"    # Merge presets (keep base + add new)
sync_folder "snippets"
sync_folder_new_only "assets"             # Only add NEW assets, don't overwrite existing

# Note: .cursor/rules/ is NOT synced - each project manages its own rules

# Summary
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Sync Complete!${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "Total files synced: ${GREEN}$SYNCED_COUNT${NC}"
echo ""

# Show what to do next
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Review changes in base theme:"
echo -e "   ${GREEN}cd $BASE_DIR && git diff${NC}"
echo ""
echo "2. Manually merge NEW locale keys (1_ prefixed only):"
echo "   - Compare: locales/en.default.json"
echo "   - Compare: locales/en.default.schema.json"
echo "   - Copy only NEW keys, don't overwrite existing"
echo ""
echo "3. Commit changes:"
echo -e "   ${GREEN}cd $BASE_DIR${NC}"
echo -e "   ${GREEN}git add .${NC}"
echo -e "   ${GREEN}git commit -m \"Sync updates from $(basename "$(pwd)")\"${NC}"
echo -e "   ${GREEN}git push origin main${NC}"
echo ""

# Offer to show diff
echo -e "${BLUE}Would you like to see the changes? (showing git status)${NC}"
echo ""
cd "$BASE_DIR"
git status --short 2>/dev/null || echo "Not a git repository"
