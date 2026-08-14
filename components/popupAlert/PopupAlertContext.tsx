import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  PopupAlertCard,
  PopupAlertState,
  PopupAlertButton,
  PopupAlertOptions,
  AlertType,
} from "./PopupAlertCard";

interface PopupAlertContextType {
  showAlert: (
    title: string,
    message?: string,
    buttons?: PopupAlertButton[],
    options?: PopupAlertOptions,
    type?: AlertType
  ) => void;
  showSuccess: (title: string, message?: string, onPress?: () => void) => void;
  showError: (title: string, message?: string, onPress?: () => void) => void;
  showWarning: (title: string, message?: string, onPress?: () => void) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
  hideAlert: () => void;
}

const PopupAlertContext = createContext<PopupAlertContextType | undefined>(
  undefined
);

// Internal reference for imperative calls outside React context
let globalShowAlert: PopupAlertContextType["showAlert"] | null = null;

export const showPopupAlert: PopupAlertContextType["showAlert"] = (
  title,
  message,
  buttons,
  options,
  type
) => {
  if (globalShowAlert) {
    globalShowAlert(title, message, buttons, options, type);
  } else {
    console.warn("PopupAlertProvider is not mounted yet.");
  }
};

export const PopupAlertProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [alertState, setAlertState] = useState<PopupAlertState>({
    visible: false,
    title: "",
  });

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: PopupAlertButton[],
      options?: PopupAlertOptions,
      type?: AlertType
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons,
        options,
        type,
      });
    },
    []
  );

  // Store ref for global calls
  globalShowAlert = showAlert;

  const showSuccess = useCallback(
    (title: string, message?: string, onPress?: () => void) => {
      showAlert(
        title,
        message,
        [{ text: "OK", onPress, style: "default" }],
        undefined,
        "success"
      );
    },
    [showAlert]
  );

  const showError = useCallback(
    (title: string, message?: string, onPress?: () => void) => {
      showAlert(
        title,
        message,
        [{ text: "OK", onPress, style: "destructive" }],
        undefined,
        "error"
      );
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (title: string, message?: string, onPress?: () => void) => {
      showAlert(
        title,
        message,
        [{ text: "OK", onPress, style: "default" }],
        undefined,
        "warning"
      );
    },
    [showAlert]
  );

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      confirmText: string = "Confirm",
      cancelText: string = "Cancel"
    ) => {
      showAlert(
        title,
        message,
        [
          { text: cancelText, style: "cancel", onPress: onCancel },
          { text: confirmText, style: "destructive", onPress: onConfirm },
        ],
        undefined,
        "confirm"
      );
    },
    [showAlert]
  );

  return (
    <PopupAlertContext.Provider
      value={{
        showAlert,
        showSuccess,
        showError,
        showWarning,
        showConfirm,
        hideAlert,
      }}
    >
      {children}
      <PopupAlertCard alert={alertState} onClose={hideAlert} />
    </PopupAlertContext.Provider>
  );
};

export const usePopupAlert = (): PopupAlertContextType => {
  const context = useContext(PopupAlertContext);
  if (!context) {
    // Return fallback calling globalShowAlert if context is omitted
    return {
      showAlert: showPopupAlert,
      showSuccess: (title, message, onPress) =>
        showPopupAlert(title, message, [{ text: "OK", onPress }], undefined, "success"),
      showError: (title, message, onPress) =>
        showPopupAlert(title, message, [{ text: "OK", onPress }], undefined, "error"),
      showWarning: (title, message, onPress) =>
        showPopupAlert(title, message, [{ text: "OK", onPress }], undefined, "warning"),
      showConfirm: (title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel") =>
        showPopupAlert(
          title,
          message,
          [
            { text: cancelText, style: "cancel", onPress: onCancel },
            { text: confirmText, style: "destructive", onPress: onConfirm },
          ],
          undefined,
          "confirm"
        ),
      hideAlert: () => {},
    };
  }
  return context;
};
