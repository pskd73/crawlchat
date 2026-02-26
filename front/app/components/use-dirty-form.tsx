import { useCallback, useMemo, useState } from "react";

export function useDirtyForm<Key extends string, Value>(
  defaults: Record<Key, Value>
) {
  const [values, setValues] = useState<Record<Key, Value>>(() => ({
    ...defaults,
  }));

  const setValue = useCallback(
    (key: Key, valueOrSetter: Value | ((prev: Value) => Value)) => {
      setValues((prev) => {
        const nextValue =
          valueOrSetter instanceof Function
            ? (valueOrSetter as (prev: Value) => Value)(prev[key])
            : valueOrSetter;
        return { ...prev, [key]: nextValue };
      });
    },
    []
  );

  const setValuesUpdater = useCallback(
    (updater: (prev: Record<Key, Value>) => Record<Key, Value>) => {
      setValues(updater);
    },
    []
  );

  const isDirty = useCallback(
    (key: Key) => {
      const defaultValue = defaults[key];
      const currentValue = values[key];
      return JSON.stringify(defaultValue) !== JSON.stringify(currentValue);
    },
    [defaults, values]
  );

  const dirtyKeys = useMemo(() => {
    const keys = new Set<Key>();
    for (const key of Object.keys(defaults) as Key[]) {
      const defaultValue = defaults[key];
      const currentValue = values[key];
      if (JSON.stringify(defaultValue) !== JSON.stringify(currentValue)) {
        keys.add(key);
      }
    }
    return keys;
  }, [defaults, values]);

  const isAnyDirty = dirtyKeys.size > 0;

  const handleChange = useCallback(
    (key: Key) =>
      (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => {
        const value =
          event.target.type === "checkbox"
            ? ((event.target as HTMLInputElement).checked as Value)
            : event.target.type === "range"
              ? (parseFloat(event.target.value) as Value)
              : (event.target.value as Value);
        setValue(key, value);
      },
    [setValue]
  );

  const reset = useCallback(
    (key?: Key) => {
      if (key !== undefined) {
        const defaultValue = defaults[key];
        if (defaultValue !== undefined) {
          setValue(key, defaultValue);
        }
      } else {
        setValues({ ...defaults });
      }
    },
    [defaults, setValue]
  );

  const getValue = useCallback((key: Key) => values[key], [values]);

  return {
    values,
    getValue,
    setValue,
    setValues: setValuesUpdater,
    handleChange,
    isDirty,
    dirtyKeys,
    isAnyDirty,
    reset,
  };
}
