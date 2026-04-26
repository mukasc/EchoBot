/**
 * EchoBot - O Cronista das Sombras
 * Copyright (C) 2026 mukas
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress ResizeObserver loop errors which are benign but trigger dev overlays
const originalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends originalResizeObserver {
  constructor(callback) {
    super((entries, observer) => {
      requestAnimationFrame(() => {
        callback(entries, observer);
      });
    });
  }
};

const resizeObserverErrMessages = [
  "ResizeObserver loop completed with undelivered notifications.",
  "ResizeObserver loop limit exceeded",
];

const suppressResizeObserverError = (e) => {
  const message = e instanceof ErrorEvent ? e.message : e;
  if (resizeObserverErrMessages.includes(message)) {
    if (e instanceof ErrorEvent) e.stopImmediatePropagation();
    return true;
  }
  return false;
};

window.addEventListener("error", suppressResizeObserverError);
window.onerror = suppressResizeObserverError;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
