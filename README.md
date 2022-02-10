## Core Search Assistant Plugin

This plugin enhances the built-in search function by providing
- **keyboard interface**,
- **card view**,
- **bigger preview**,
- **auto preview**,

![main-min](https://user-images.githubusercontent.com/38106890/150084212-d47733c7-3e84-437c-a257-5dd7ee6a8be5.gif)
![focus-min](https://user-images.githubusercontent.com/38106890/151547284-739a18a3-3467-4964-b59b-de8c2673018c.gif)

### How to use
When you open the built-in search panel, you enter **search mode**.
In the search mode, you can use the following hotkeys.

| Key | Action |
| -- | -- |
| `Ctrl + N`, `↓` | Select the next item. |
| `Ctrl + P`, `↑` | Select the previous item. |
| `Ctrl + Space` | Preview the selected item. Currently **not** supported in the legacy editor. ([Manual preview](#manual-preview)) |
| `Ctrl + Enter` | Open the selected item. |
| `Ctrl + Shift + Enter` | Open the selected item in a new pane. |
| `Shift + Space` | Set search options. |

- The hotkeys above are available only in the search mode, so don't worry about overwriting your hotkey settings.
- To **exit** the search mode, press `Esc` or click any part of the screen other than the .

### Auto Preview
There are three options for auto preview.
1. none,
2. single view,
3. card view.

#### 1. None

Manual preview by `Ctrl + Enter`  is still available.

![none-view-min](https://user-images.githubusercontent.com/38106890/150082308-493df0a0-e9d4-46ee-8957-c11a2f5ce628.gif)

#### 2. Single view

Previewed item can be scrolled unlike card view.

![single-view-min](https://user-images.githubusercontent.com/38106890/150082234-54a39bce-5ba7-4b53-88c7-603310f14274.gif)

#### 3. Card view

Available layouts:
- 2 x 2,
- 2 x 3,
- 3 x 2,
- 3 x 3.

If rendered results are wrong, press `Enter` to reload.

![card-view-min](https://user-images.githubusercontent.com/38106890/150082177-6a14a509-b6f9-449f-90d1-7e198ae2d3d3.gif)

### Manual Preview
**Currently manual preview is not supported in the legacy editor.**

In the preview modal, the following hotkeys are available.

| Key | Action |
| -- | -- |
| `Ctrl + N`, `↓` | Scroll down a bit. |
| `Ctrl + P`, `↑` | Scroll up a bit. |
| `Space` | Scroll down a lot. |
| `Shit + Space` | Scroll up a lot. |
| `Ctrl + Enter` | Open the selected item. |
| `Ctrl + Shift + Enter` | Open the selected item in a new pane. |
| `Esc`, `Ctrl + Space` | Close the modal. |
| `Tab` | Focus on the next match. |
| `Shift + Tab` | Focus on the previous match. |

You can also toggle the preview mode by your hotkey.

![focus-min](https://user-images.githubusercontent.com/38106890/151547284-739a18a3-3467-4964-b59b-de8c2673018c.gif)

### Search options

![search-option-min](https://user-images.githubusercontent.com/38106890/150083314-0834e593-2cd6-46c6-8706-5582e987037a.gif)

