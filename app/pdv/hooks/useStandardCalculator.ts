"use client";

import { useCallback, useMemo, useState } from "react";

type BinaryOperator = "+" | "-" | "*" | "/";

const MAX_DISPLAY_LENGTH = 18;
const DIGIT_KEYS = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
const OPERATOR_KEYS = new Set<BinaryOperator>(["+", "-", "*", "/"]);

function normalizeResult(value: number): string {
  if (!Number.isFinite(value)) {
    return "Erro";
  }

  const normalized = parseFloat(value.toFixed(12)).toString();
  return normalized.length > MAX_DISPLAY_LENGTH
    ? value.toPrecision(12).replace(/\.?0+e/, "e")
    : normalized;
}

function applyBinaryOperation(left: number, right: number, operator: BinaryOperator): string {
  switch (operator) {
    case "+":
      return normalizeResult(left + right);
    case "-":
      return normalizeResult(left - right);
    case "*":
      return normalizeResult(left * right);
    case "/":
      return right === 0 ? "Erro" : normalizeResult(left / right);
  }
}

export function useStandardCalculator() {
  const [display, setDisplay] = useState("0");
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<BinaryOperator | null>(null);
  const [waitingForNextValue, setWaitingForNextValue] = useState(false);
  const [lastOperator, setLastOperator] = useState<BinaryOperator | null>(null);
  const [lastOperand, setLastOperand] = useState<number | null>(null);

  const isError = display === "Erro";

  const clearAll = useCallback(() => {
    setDisplay("0");
    setStoredValue(null);
    setPendingOperator(null);
    setWaitingForNextValue(false);
    setLastOperator(null);
    setLastOperand(null);
  }, []);

  const commitDisplay = useCallback(
    (nextDisplay: string) => {
      if (nextDisplay === "Erro") {
        setDisplay("Erro");
        setStoredValue(null);
        setPendingOperator(null);
        setWaitingForNextValue(true);
        return;
      }

      setDisplay(nextDisplay);
      setStoredValue(Number(nextDisplay));
      setWaitingForNextValue(true);
    },
    []
  );

  const inputDigit = useCallback(
    (digit: string) => {
      if (!DIGIT_KEYS.has(digit)) {
        return;
      }

      if (isError || waitingForNextValue) {
        setDisplay(digit);
        setWaitingForNextValue(false);
        if (isError) {
          setStoredValue(null);
          setPendingOperator(null);
          setLastOperator(null);
          setLastOperand(null);
        }
        return;
      }

      setDisplay((current) => {
        if (current === "0") {
          return digit;
        }

        if (current.length >= MAX_DISPLAY_LENGTH) {
          return current;
        }

        return `${current}${digit}`;
      });
    },
    [isError, waitingForNextValue]
  );

  const inputDecimal = useCallback(() => {
    if (isError) {
      setDisplay("0.");
      setWaitingForNextValue(false);
      setStoredValue(null);
      setPendingOperator(null);
      setLastOperator(null);
      setLastOperand(null);
      return;
    }

    if (waitingForNextValue) {
      setDisplay("0.");
      setWaitingForNextValue(false);
      return;
    }

    setDisplay((current) => (current.includes(".") ? current : `${current}.`));
  }, [isError, waitingForNextValue]);

  const backspace = useCallback(() => {
    if (isError) {
      clearAll();
      return;
    }

    if (waitingForNextValue) {
      return;
    }

    setDisplay((current) => {
      if (current.length <= 1) {
        return "0";
      }

      const next = current.slice(0, -1);
      return next === "-" ? "0" : next;
    });
  }, [clearAll, isError, waitingForNextValue]);

  const inputOperator = useCallback(
    (operator: BinaryOperator) => {
      if (!OPERATOR_KEYS.has(operator)) {
        return;
      }

      if (isError) {
        return;
      }

      const currentValue = Number(display);

      if (pendingOperator && storedValue !== null && !waitingForNextValue) {
        const result = applyBinaryOperation(storedValue, currentValue, pendingOperator);
        commitDisplay(result);
        setLastOperator(pendingOperator);
        setLastOperand(currentValue);
        if (result === "Erro") {
          setPendingOperator(null);
          return;
        }
      } else if (storedValue === null) {
        setStoredValue(currentValue);
      }

      setPendingOperator(operator);
      setWaitingForNextValue(true);
    },
    [commitDisplay, display, isError, pendingOperator, storedValue, waitingForNextValue]
  );

  const calculate = useCallback(() => {
    if (isError) {
      return;
    }

    const currentValue = Number(display);

    if (pendingOperator && storedValue !== null) {
      const operand = waitingForNextValue ? storedValue : currentValue;
      const result = applyBinaryOperation(storedValue, operand, pendingOperator);
      commitDisplay(result);
      setLastOperator(pendingOperator);
      setLastOperand(operand);
      setPendingOperator(null);
      return;
    }

    if (lastOperator && lastOperand !== null) {
      const result = applyBinaryOperation(currentValue, lastOperand, lastOperator);
      commitDisplay(result);
    }
  }, [
    commitDisplay,
    display,
    isError,
    lastOperand,
    lastOperator,
    pendingOperator,
    storedValue,
    waitingForNextValue,
  ]);

  const onButtonPress = useCallback(
    (value: string) => {
      if (DIGIT_KEYS.has(value)) {
        inputDigit(value);
        return;
      }

      switch (value) {
        case ".":
          inputDecimal();
          return;
        case "Backspace":
          backspace();
          return;
        case "C":
          clearAll();
          return;
        case "=":
          calculate();
          return;
        case "+":
        case "-":
        case "*":
        case "/":
          inputOperator(value);
          return;
      }
    },
    [backspace, calculate, clearAll, inputDecimal, inputDigit, inputOperator]
  );

  const inputFromKeyboard = useCallback(
    (event: KeyboardEvent): boolean => {
      const { code, key } = event;

      if (DIGIT_KEYS.has(key)) {
        inputDigit(key);
        return true;
      }

      if (code.startsWith("Numpad") && DIGIT_KEYS.has(code.replace("Numpad", ""))) {
        inputDigit(code.replace("Numpad", ""));
        return true;
      }

      if (key === "," || key === "." || code === "NumpadDecimal") {
        inputDecimal();
        return true;
      }

      if (
        key === "+" ||
        key === "-" ||
        key === "*" ||
        key === "/" ||
        code === "NumpadAdd" ||
        code === "NumpadSubtract" ||
        code === "NumpadMultiply" ||
        code === "NumpadDivide"
      ) {
        const operator =
          code === "NumpadAdd"
            ? "+"
            : code === "NumpadSubtract"
              ? "-"
              : code === "NumpadMultiply"
                ? "*"
                : code === "NumpadDivide"
                  ? "/"
                  : (key as BinaryOperator);

        inputOperator(operator);
        return true;
      }

      if (key === "Enter" || key === "=" || code === "NumpadEnter") {
        calculate();
        return true;
      }

      if (key === "Backspace") {
        backspace();
        return true;
      }

      if (key === "Escape") {
        clearAll();
        return true;
      }

      return false;
    },
    [backspace, calculate, clearAll, inputDecimal, inputDigit, inputOperator]
  );

  const operatorLabel = useMemo(() => pendingOperator ?? "", [pendingOperator]);

  return {
    display,
    isError,
    operatorLabel,
    clearAll,
    backspace,
    onButtonPress,
    inputFromKeyboard,
  };
}
