import React from "react";
import { Modal, View, Text, Pressable } from "react-native";

interface ModalAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionModalProps {
  visible: boolean;
  title: string;
  body: React.ReactNode;
  actions: ModalAction[];
  onDismiss?: () => void;
}

export function ActionModal({ visible, title, body, actions, onDismiss }: ActionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        className="flex-1 justify-end bg-black/60"
        onPress={onDismiss}
      >
        <Pressable onPress={() => {}} className="bg-zinc-900 rounded-t-3xl px-6 pt-6 pb-10 gap-5">
          <Text className="text-zinc-100 font-bold text-lg">{title}</Text>
          <View>{body}</View>
          <View className="gap-3">
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                className={`rounded-2xl min-h-[52px] items-center justify-center ${
                  action.destructive
                    ? "bg-red-500/20 border border-red-500/40"
                    : "bg-zinc-800 border border-zinc-700"
                }`}
              >
                <Text
                  className={`font-semibold text-base ${
                    action.destructive ? "text-red-400" : "text-zinc-100"
                  }`}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
