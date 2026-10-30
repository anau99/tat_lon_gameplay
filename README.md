# TẠT LON! — Traditional Slipper-Throwing Game

A browser-based prototype inspired by the Vietnamese traditional game **Tạt Lon**. The interface and source-code comments are in English; the game title remains **TẠT LON!**.

## Project files

```text
index.html   Page structure and game controls
style.css    Layout, presentation, and responsive styling
script.js    Game rules, state, movement, collisions, and AI
README.md    Gameplay and setup documentation
```

## Run locally

1. Keep `index.html`, `style.css`, and `script.js` in the same directory.
2. Open `index.html` in a modern web browser.
3. No server, package manager, or external dependencies are required.

## Controls

| Control | Action |
|---|---|
| W / A / S / D or arrow keys | Move the character |
| Aim slider | Change throwing angle (Thrower only) |
| Power slider | Change throwing power (Thrower only) |
| Space or THROW! | Throw the slipper when permitted |
| Restart | Reset the game to its initial state |

## Roles

- **Thrower:** Throws the slipper at the can, retrieves it, and tries to return behind the safety line.
- **Guard:** Restores the can to its designated circle when needed and attempts to tag the Thrower under the conditions below.
- The human player controls one role; the AI controls the other. A successful tag swaps the roles and starts another round.

## Gameplay rules (current corrected version)

1. **Prepare:** The Thrower begins behind the throwing/safety line with the slipper. The can begins standing in its circle.
2. **Throw:** Aim and throw. The Thrower can move as soon as the slipper is in flight. Another throw is not available until the slipper has been retrieved and the Thrower has returned to safety.
3. **Retrieve:** Once the slipper lands, the Thrower can pick it up **whether the can fell or stayed upright**. Touching the slipper on the ground means the Thrower is now carrying it.
4. **Restore the can:** If it falls, the Guard must collect it, return it to the circle, and stand it up. A missed throw leaves the can standing in its original position.
5. **Tagging:** The Guard can swap roles **only by touching the Thrower**, and only when all three conditions are true:
   - The can is upright at its designated position in the circle.
   - The Thrower has retrieved and is carrying the slipper.
   - The Thrower is still outside the safe area.
6. **Safety:** If the Thrower carrying the slipper reaches the safe area behind the line before being tagged, they are safe and may throw again. The Guard cannot tag them once they are safe.
7. **Role swap:** A valid Guard-to-Thrower tag swaps both roles, resets the can, slipper, and starting positions, and begins the next round. **Touching the unattended slipper does not swap roles.**

### Rule summary

```text
Throw slipper
    |
    v
Slipper lands -----> Thrower may retrieve it (hit OR miss)
    |
    +-- Can fell? YES --> Guard restores can in circle
    |          NO  --> Can is already correctly positioned
    |
    v
Thrower carrying slipper + can upright in circle + outside safe area?
    |
    +-- YES: Guard may tag Thrower -> SWAP ROLES, start next round
    |
    +-- Thrower reaches safety first -> SAFE, continue as Thrower
```

## Implementation notes

The game uses an HTML Canvas and a JavaScript state machine. The can state, slipper possession, safety-line position, and current player roles are tracked independently so the rules above can be evaluated together.

**Current limitations:** This is a gameplay prototype, not a finished production game. AI behavior, collisions, hit detection, character animation, and UI responsiveness may require further in-browser testing and refinement. The gameplay rules above describe the intended behavior of the corrected build.
