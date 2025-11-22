# Cursor Configuration

This directory contains Cursor-specific configuration files to enhance your development experience.

## Files

### `.cursorrules`
Defines project-specific rules and conventions for Cursor AI to follow when generating code. This helps ensure:
- Consistent code style
- Proper use of project patterns
- Security best practices
- Performance considerations

### `plan.md`
Development roadmap and task tracking. Use this to:
- Track project progress
- Plan next features
- Document technical debt
- Maintain focus on priorities

## How to Use

### Cursor Rules
Cursor will automatically read `.cursorrules` when generating code. The AI will:
- Follow your naming conventions
- Use your preferred patterns
- Respect security guidelines
- Apply your code style

### Plan File
Update `plan.md` as you:
- Complete features (check off items)
- Add new requirements
- Identify technical debt
- Plan future enhancements

You can reference the plan in conversations:
- "What's next according to plan.md?"
- "Update plan.md to mark feature X as complete"
- "Add new feature Y to the plan"

## Tips

1. **Keep rules updated**: As your project evolves, update `.cursorrules` to reflect new patterns
2. **Review plan regularly**: Check off completed items and adjust priorities
3. **Be specific**: More detailed rules = better AI suggestions
4. **Iterate**: Refine rules based on what works best for your workflow

