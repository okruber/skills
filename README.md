# skills

okruber's personal agent skills. Authored skills live in `skills/` and symlink
into `~/.agents/skills`, so edits are live immediately. Consumed third-party
skills aren't vendored — `consumed.md` records what to pull and how.

## New machine

```bash
git clone git@github.com:okruber/skills.git ~/Documents/Personal/skills
cd ~/Documents/Personal/skills && ./bootstrap.sh
```

## Credits

`skills/show-me` adapts the visual forms of HumanLayer's
[`show-me`](https://github.com/humanlayer/skills/tree/main/plugins/show-me) skill
(MIT) and adds a fixed output contract.
