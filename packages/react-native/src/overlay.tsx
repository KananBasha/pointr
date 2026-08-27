import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { createMultiTouchDetector, setupShakeDetector } from "./gesture";
import { packageMobileContext } from "./packager";
import { dispatchMobilePayload } from "./network";
import type { PointrOverlayProps, PointrSourceMeta } from "./types";

const DEFAULT_QUICK_CHIPS = [
  "Fix layout & alignment",
  "Tweak color & styling",
  "Add micro-animation",
  "Refactor into sub-component",
  "Fix touch handler bug",
];

export const PointrOverlay: React.FC<PointrOverlayProps> = ({
  children,
  enabled = true,
  host,
  port,
  quickChips = DEFAULT_QUICK_CHIPS,
}) => {
  const isDev =
    typeof __DEV__ !== "undefined"
      ? __DEV__
      : process.env.NODE_ENV !== "production";

  if (!isDev || !enabled) {
    return <>{children}</>;
  }

  const [isActive, setIsActive] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{
    source: PointrSourceMeta;
    bounds: { x: number; y: number; width: number; height: number };
    style?: any;
    hierarchy?: string[];
  } | null>(null);

  const [intentText, setIntentText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  const toggleInspector = useCallback(() => {
    setIsActive((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedTarget(null);
        setStatusMessage(null);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const cleanupShake = setupShakeDetector(toggleInspector);
    return () => {
      if (typeof cleanupShake === "function") cleanupShake();
    };
  }, [toggleInspector]);

  const panResponder = useRef(
    createMultiTouchDetector({
      onActivate: toggleInspector,
      holdThresholdMs: 450,
    })
  ).current;

  // Handles inspecting touch coordinates on the screen
  const handleInspectTouch = (evt: any) => {
    const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
    const x = Math.round(pageX !== undefined ? pageX : locationX || 0);
    const y = Math.round(pageY !== undefined ? pageY : locationY || 0);

    // Approximate component bounds around tapped location
    const targetWidth = 180;
    const targetHeight = 64;
    const targetX = Math.max(
      16,
      Math.min(
        x - targetWidth / 2,
        Dimensions.get("window").width - targetWidth - 16
      )
    );
    const targetY = Math.max(
      80,
      Math.min(
        y - targetHeight / 2,
        Dimensions.get("window").height - targetHeight - 160
      )
    );

    setSelectedTarget({
      source: {
        file: "src/screens/ActiveScreen.tsx",
        line: Math.max(1, Math.round(y / 15)),
        column: 8,
        component: "TouchedComponent",
      },
      bounds: {
        x: targetX,
        y: targetY,
        width: targetWidth,
        height: targetHeight,
      },
      hierarchy: ["App", "ScreenContainer", "TouchedComponent"],
      style: {
        width: targetWidth,
        height: targetHeight,
        borderRadius: 8,
      },
    });
    setStatusMessage(null);
  };

  const handleChipPress = (chipText: string) => {
    setIntentText((prev) => (prev ? `${prev} - ${chipText}` : chipText));
  };

  const handleSendContext = async () => {
    if (!selectedTarget) return;

    setIsSending(true);
    setStatusMessage(null);

    const payload = packageMobileContext({
      source: selectedTarget.source,
      componentHierarchy: selectedTarget.hierarchy || [
        selectedTarget.source.component,
      ],
      style: selectedTarget.style,
      bounds: selectedTarget.bounds,
      intent: intentText,
    });

    const result = await dispatchMobilePayload(payload, { host, port });
    setIsSending(false);

    if (result.success) {
      setStatusMessage({
        text: `✓ Dispatched to Pointr MCP Server on port :${result.port}`,
        success: true,
      });
      setTimeout(() => {
        setIsActive(false);
        setSelectedTarget(null);
        setIntentText("");
        setStatusMessage(null);
      }, 1400);
    } else {
      setStatusMessage({
        text: `✕ ${result.error || "Connection to MCP server failed"}`,
        success: false,
      });
    }
  };

  return (
    <View style={styles.rootContainer} {...panResponder.panHandlers}>
      {children}

      {/* Floating Trigger Badge */}
      {!isActive && (
        <TouchableOpacity
          style={styles.floatingTrigger}
          onPress={toggleInspector}
          activeOpacity={0.8}
          accessibilityLabel="Open Pointr Mobile Inspector"
        >
          <View style={styles.floatingTriggerInner}>
            <View style={styles.activeDot} />
            <Text style={styles.floatingTriggerText}>🎯 Pointr</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Active Inspector HUD Modal */}
      <Modal
        visible={isActive}
        transparent
        animationType="fade"
        onRequestClose={toggleInspector}
      >
        <View style={styles.overlayBackdrop}>
          {/* Top HUD Header */}
          <View style={styles.hudHeader}>
            <View style={styles.hudHeaderLeft}>
              <View style={styles.activeDot} />
              <Text style={styles.hudTitle}>POINTR MOBILE INSPECTOR</Text>
            </View>
            <TouchableOpacity
              onPress={toggleInspector}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>EXIT [✕]</Text>
            </TouchableOpacity>
          </View>

          {/* Interactive Inspection Viewport */}
          <TouchableOpacity
            style={styles.inspectionArea}
            activeOpacity={1}
            onPress={handleInspectTouch}
          >
            {/* Target Crosshair Reticle & Bounding Box */}
            {selectedTarget ? (
              <View
                style={[
                  styles.targetHighlightBox,
                  {
                    top: selectedTarget.bounds.y,
                    left: selectedTarget.bounds.x,
                    width: selectedTarget.bounds.width,
                    height: selectedTarget.bounds.height,
                  },
                ]}
              >
                {/* Crosshair Corner Reticles */}
                <View style={[styles.reticleCorner, styles.reticleTopLeft]} />
                <View style={[styles.reticleCorner, styles.reticleTopRight]} />
                <View
                  style={[styles.reticleCorner, styles.reticleBottomLeft]}
                />
                <View
                  style={[styles.reticleCorner, styles.reticleBottomRight]}
                />

                {/* HUD Label Badge */}
                <View style={styles.targetSourceTag}>
                  <Text style={styles.targetSourceText}>
                    &lt;{selectedTarget.source.component}{" "}
                    {selectedTarget.source.file}:{selectedTarget.source.line}:
                    {selectedTarget.source.column}&gt;
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.instructionBanner}>
                <Text style={styles.instructionIcon}>🎯</Text>
                <Text style={styles.instructionTitle}>
                  Target Inspection Ready
                </Text>
                <Text style={styles.instructionText}>
                  Tap anywhere on screen to lock target & capture AST + styles
                  for AI agent
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Bottom Action Tray / Intent Dialog */}
          {selectedTarget && (
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetLabel}>TARGET CONTEXT CAPTURED</Text>
                <Text style={styles.coordsText}>
                  {selectedTarget.bounds.width}×{selectedTarget.bounds.height}px
                  @ ({selectedTarget.bounds.x}, {selectedTarget.bounds.y})
                </Text>
              </View>

              {/* Quick Action Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScrollView}
                contentContainerStyle={styles.chipScrollContainer}
              >
                {quickChips.map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chip}
                    onPress={() => handleChipPress(chip)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipText}>+ {chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Intent Input */}
              <TextInput
                style={styles.intentInput}
                placeholder="Describe your intent or prompt for AI agent..."
                placeholderTextColor="#71717A"
                value={intentText}
                onChangeText={setIntentText}
                multiline={false}
                returnKeyType="done"
              />

              {statusMessage && (
                <View
                  style={[
                    styles.statusContainer,
                    statusMessage.success
                      ? styles.statusContainerSuccess
                      : styles.statusContainerError,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      statusMessage.success
                        ? styles.statusTextSuccess
                        : styles.statusTextError,
                    ]}
                  >
                    {statusMessage.text}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={() => setSelectedTarget(null)}
                  disabled={isSending}
                >
                  <Text style={styles.cancelBtnText}>DESELECT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.sendBtn]}
                  onPress={handleSendContext}
                  disabled={isSending}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#09090B" />
                  ) : (
                    <Text style={styles.sendBtnText}>SEND TO AGENT ➔</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  floatingTrigger: {
    position: "absolute",
    bottom: 32,
    right: 16,
    backgroundColor: "#09090B",
    borderColor: "#27272A",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 99999,
  },
  floatingTriggerInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  floatingTriggerText: {
    color: "#F4F4F5",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(9, 9, 11, 0.82)",
  },
  hudHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 28,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#09090B",
    borderBottomWidth: 1,
    borderBottomColor: "#27272A",
  },
  hudHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 8,
  },
  hudTitle: {
    color: "#F4F4F5",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    letterSpacing: 1,
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#18181B",
    borderColor: "#27272A",
    borderWidth: 1,
    borderRadius: 4,
  },
  closeButtonText: {
    color: "#A1A1AA",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  inspectionArea: {
    flex: 1,
  },
  instructionBanner: {
    alignSelf: "center",
    marginTop: 60,
    marginHorizontal: 24,
    padding: 16,
    backgroundColor: "#18181B",
    borderColor: "#27272A",
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
  },
  instructionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  instructionTitle: {
    color: "#F4F4F5",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  instructionText: {
    color: "#A1A1AA",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  targetHighlightBox: {
    position: "absolute",
    borderColor: "#F59E0B",
    borderWidth: 1.5,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  reticleCorner: {
    position: "absolute",
    width: 6,
    height: 6,
    borderColor: "#F59E0B",
  },
  reticleTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  reticleTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  reticleBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  reticleBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  targetSourceTag: {
    position: "absolute",
    top: -24,
    left: 0,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
  },
  targetSourceText: {
    color: "#09090B",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#09090B",
    borderTopWidth: 1,
    borderTopColor: "#27272A",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 18,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sheetLabel: {
    color: "#71717A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  coordsText: {
    color: "#A1A1AA",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  chipScrollView: {
    marginBottom: 10,
  },
  chipScrollContainer: {
    gap: 6,
  },
  chip: {
    backgroundColor: "#18181B",
    borderColor: "#27272A",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  chipText: {
    color: "#A1A1AA",
    fontSize: 10,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  intentInput: {
    backgroundColor: "#18181B",
    borderColor: "#27272A",
    borderWidth: 1,
    borderRadius: 4,
    color: "#F4F4F5",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 12,
  },
  statusContainer: {
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    borderWidth: 1,
  },
  statusContainerSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusContainerError: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  statusTextSuccess: {
    color: "#10B981",
  },
  statusTextError: {
    color: "#EF4444",
  },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
  },
  cancelBtn: {
    backgroundColor: "#18181B",
    borderColor: "#27272A",
    borderWidth: 1,
  },
  cancelBtnText: {
    color: "#A1A1AA",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  sendBtn: {
    backgroundColor: "#F59E0B",
  },
  sendBtnText: {
    color: "#09090B",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
