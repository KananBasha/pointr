# @pointr/react-native

> Visual AI context picker & AST inspector for React Native & Expo applications.

`@pointr/react-native` enables mobile developers using React Native (Expo Go, Expo Bare, and Bare React Native) on iOS and Android to visually inspect any component, capture its AST source coordinates, native hierarchy, and computed `StyleSheet` rules, and dispatch the context directly to local AI coding agents via the Pointr MCP Server.

---

## ⚡️ Key Features

- 🎯 **Pixel-Accurate AST Source Location**: Injects file path, line number, column, and component name into JSX at compile time via Babel.
- 📱 **Zero Native Binary Dependencies**: Pure JS/TS implementation using built-in React Native APIs (`PanResponder`, `Dimensions`, `NativeModules`, `Platform`). Works out of the box in standard **Expo Go** without custom development builds.
- 🌐 **Automatic LAN Host Discovery**: Resolves host machine IP automatically over LAN via Metro `scriptURL`, Android Emulator (`10.0.2.2`), and iOS Simulator (`127.0.0.1`).
- 🔘 **Multi-Touch & Shake Triggers**: Activate with a 2-finger long press (≥500ms), developer shake menu, or subtle floating HUD badge.
- 🎨 **Tech-Brutalist HUD Design**: High contrast, dark zinc aesthetic with zero purple, quick action chips, and instant feedback.
- 🤖 **Local AI Agent Integration**: Seamlessly sends structured payloads and rich Markdown to `@pointr/mcp-server`.

---

## 📦 Installation

```bash
npm install @pointr/react-native
# or
pnpm add @pointr/react-native
# or
yarn add @pointr/react-native
```

### Peer Dependencies

- `react >= 18.0.0`
- `react-native >= 0.70.0`

---

## 🚀 Quick Setup

### 1. Configure Babel (`babel.config.js` or `metro.config.js`)

Add the Pointr Babel plugin to your Babel configuration:

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["@pointr/react-native/babel"],
  };
};
```

Or wrap your configuration with `withPointrBabel`:

```javascript
// babel.config.js
const { withPointrBabel } = require("@pointr/react-native/babel");

module.exports = withPointrBabel(function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
});
```

### 2. Wrap Root App with `<PointrOverlay />`

```tsx
// App.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PointrOverlay } from "@pointr/react-native";

export default function App() {
  return (
    <PointrOverlay>
      <View style={styles.container}>
        <Text style={styles.title}>Hello Pointr!</Text>
      </View>
    </PointrOverlay>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090B",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#F4F4F5",
    fontSize: 20,
    fontWeight: "bold",
  },
});
```

---

## 📖 API Reference

### `<PointrOverlay />` Props

| Prop         | Type              | Default       | Description                                                      |
| ------------ | ----------------- | ------------- | ---------------------------------------------------------------- |
| `children`   | `React.ReactNode` | Required      | Root application views to wrap.                                  |
| `enabled`    | `boolean`         | `true`        | Enables/disables overlay (automatically disabled in production). |
| `host`       | `string`          | Auto          | Override development host IP address.                            |
| `port`       | `number`          | `3333`        | Pointr MCP server start port (scans 3333-3340).                  |
| `quickChips` | `string[]`        | Default chips | Custom action chips for developer intent dialog.                 |

### Utilities

- `packageMobileContext(params)`: Serializes component hierarchy, layout, and StyleSheet rules.
- `resolveHostMachineIp(overrideHost?)`: Returns LAN host IP for mobile devices.
- `dispatchMobilePayload(payload, config?)`: Posts mobile context to local MCP server.
- `sendMobilePayload(payload, port?)`: Dispatches context returning boolean success.

---

## 📄 License

MIT © Pointr Team
