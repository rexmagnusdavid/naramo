import React, { useState, useRef, useCallback, ReactNode } from "react";
import { View, TextInput, ActivityIndicator } from "react-native";

interface SearchInputProps<T> {
  placeholder: string;
  queryFn: (text: string) => Promise<T[]>;
  /**
   * Render a suggestion row. Receives the item, its index, and an `onPress`
   * callback — pass `onPress` to your Pressable so SearchInput can clear state.
   */
  renderSuggestion: (item: T, index: number, onPress: () => void) => ReactNode;
  onSelect: (item: T) => void;
  debounceMs?: number;
  minLength?: number;
  /** Show spinner while caller loads after a selection (e.g. fetching place details) */
  extraLoading?: boolean;
  /** Omit the default dropdown container — caller's renderSuggestion provides its own styling */
  bare?: boolean;
}

export function SearchInput<T>({
  placeholder,
  queryFn,
  renderSuggestion,
  onSelect,
  debounceMs = 300,
  minLength = 2,
  extraLoading = false,
  bare = false,
}: SearchInputProps<T>) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [fetching, setFetching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.length < minLength) {
        setSuggestions([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setFetching(true);
        const results = await queryFn(text);
        setSuggestions(results);
        setFetching(false);
      }, debounceMs);
    },
    [queryFn, debounceMs, minLength]
  );

  function handleSelect(item: T) {
    setSuggestions([]);
    setQuery("");
    onSelect(item);
  }

  return (
    <View>
      <View className="relative">
        <TextInput
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-zinc-100 text-sm"
          style={{ minHeight: 48, paddingRight: 44 }}
          placeholder={placeholder}
          placeholderTextColor="#52525b"
          value={query}
          onChangeText={handleChangeText}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {(fetching || extraLoading) && (
          <View className="absolute right-3 top-0 bottom-0 justify-center">
            <ActivityIndicator size="small" color="#71717a" />
          </View>
        )}
      </View>

      {suggestions.length > 0 && (
        bare ? (
          <View className="mt-1">
            {suggestions.map((item, index) =>
              renderSuggestion(item, index, () => handleSelect(item))
            )}
          </View>
        ) : (
          <View className="mt-1 bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
            {suggestions.map((item, index) =>
              renderSuggestion(item, index, () => handleSelect(item))
            )}
          </View>
        )
      )}
    </View>
  );
}
