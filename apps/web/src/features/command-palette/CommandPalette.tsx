import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Kbd";
import {
  filterCommands,
  useCommands,
  type CommandItem,
} from "@/features/command-palette/commands";
import { modifierLabel } from "@/lib/platform";
import { useUiStore } from "@/stores/ui-store";

function grouped(
  commands: CommandItem[],
): Array<{ group: string; items: CommandItem[] }> {
  const order = ["Navigation", "Appearance", "Workspace"];
  return order
    .map((group) => ({
      group,
      items: commands.filter((command) => command.group === group),
    }))
    .filter((entry) => entry.items.length > 0);
}

export function CommandPalette() {
  const open = useUiStore((state) => state.commandPaletteOpen);
  const closeCommandPalette = useUiStore((state) => state.closeCommandPalette);
  const openCommandPalette = useUiStore((state) => state.openCommandPalette);
  const navigate = useNavigate();
  const location = useLocation();
  const goTo = useCallback(
    (to: string) => {
      void navigate(to);
    },
    [navigate],
  );
  const commands = useCommands(goTo, location.pathname);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => filterCommands(commands, query), [commands, query]);
  const groups = grouped(matches);
  const activeCommand = matches[activeIndex];

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeCommandPalette, open, openCommandPalette]);

  const run = (command: CommandItem) => {
    closeCommandPalette();
    command.perform();
  };

  return (
    <Dialog
      open={open}
      title="Command palette"
      onClose={closeCommandPalette}
      className="overflow-hidden"
    >
      <div className="border-b border-line px-3 py-2">
        <label className="sr-only" htmlFor="command-search">
          Commands
        </label>
        <input
          id="command-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) =>
                Math.min(index + 1, Math.max(matches.length - 1, 0)),
              );
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (activeCommand) {
                run(activeCommand);
              }
            }
          }}
          placeholder="Commands…"
          className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="command-results"
          aria-activedescendant={
            activeCommand ? `command-${activeCommand.id}` : undefined
          }
        />
      </div>
      <ul
        id="command-results"
        role="listbox"
        aria-label="Command results"
        className="max-h-80 overflow-auto py-2"
      >
        {matches.length === 0 ? (
          <li className="px-4 py-6 text-sm text-ink-muted">No matching commands</li>
        ) : (
          groups.map((group) => (
            <li key={group.group} className="px-2">
              <p className="px-2 py-1 font-mono text-[10px] tracking-[0.16em] text-ink-muted uppercase">
                {group.group}
              </p>
              <ul>
                {group.items.map((command) => {
                  const index = matches.indexOf(command);
                  const active = index === activeIndex;
                  return (
                    <li key={command.id} role="none">
                      <button
                        id={`command-${command.id}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`flex w-full items-center justify-between rounded-[var(--facilio-radius-md)] px-2 py-2 text-left text-sm ${
                          active
                            ? "bg-subtle text-ink"
                            : "text-ink-secondary hover:bg-subtle hover:text-ink"
                        }`}
                        onMouseEnter={() => {
                          setActiveIndex(index);
                        }}
                        onClick={() => {
                          run(command);
                        }}
                      >
                        {command.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))
        )}
      </ul>
      <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[11px] text-ink-muted">
        <span>{modifierLabel()}K to toggle</span>
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span>to move</span>
          <Kbd>↵</Kbd>
          <span>to run</span>
        </span>
      </div>
    </Dialog>
  );
}
