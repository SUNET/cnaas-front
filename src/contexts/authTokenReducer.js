import { jwtDecode } from "jwt-decode";
import { storeValueIsUndefined } from "../utils/formatters";

export const initialAuthTokenState = {
  loggedIn: false,
  loginMessage: "",
  token: null,
  tokenExpiry: null,
  tokenWillExpire: false,
  username: "",
};

export const actions = {
  LOAD_TOKEN_FROM_STORAGE: "LOAD_TOKEN_FROM_STORAGE",
  LOGOUT: "LOGOUT",
  SET_LOGIN_MESSAGE: "SET_LOGIN_MESSAGE",
  SET_TOKEN: "SET_TOKEN",
  SET_TOKEN_WILL_EXPIRE: "SET_TOKEN_WILL_EXPIRE",
  SET_USERNAME: "SET_USERNAME",
};

export function authTokenReducer(state, action) {
  switch (action.type) {
    case actions.LOAD_TOKEN_FROM_STORAGE: {
      const tokenStored = getTokenFromStorage();
      if (storeValueIsUndefined(tokenStored)) {
        removeTokenFromStorage();
        return {
          ...state,
          loggedIn: false,
          token: null,
          tokenExpiry: null,
          tokenWillExpire: false,
        };
      }

      const { time } = action.payload;
      return {
        ...state,
        token: tokenStored,
        ...decodeToken(time, tokenStored),
      };
    }
    case actions.LOGOUT: {
      removeDeviceFilterDataFromStorage();
      removeTokenFromStorage();
      return {
        ...state,
        loginMessage: "You have been logged out",
        loggedIn: false,
        token: null,
        tokenExpiry: null,
        tokenWillExpire: false,
        username: "",
      };
    }
    case actions.SET_LOGIN_MESSAGE: {
      return {
        ...state,
        loginMessage: action.payload,
      };
    }
    case actions.SET_TOKEN: {
      const { time, token } = action.payload;
      addTokenToStorage(token);

      return {
        ...state,
        token,
        ...decodeToken(time, token),
      };
    }
    case actions.SET_TOKEN_WILL_EXPIRE: {
      return {
        ...state,
        tokenWillExpire: action.payload,
      };
    }
    case actions.SET_USERNAME: {
      return {
        ...state,
        username: action.payload,
      };
    }
    default: {
      console.warn(`Unknown action dispatched: ${action.type}`);
      return state;
    }
  }
}

const decodeToken = (time, token) => {
  try {
    const decodedToken = jwtDecode(token);
    const secondsUntilExpiry = getSecondsUntilExpiry(decodedToken.exp, time);
    return {
      username: decodedToken.preferred_username ?? decodedToken.email,
      tokenExpiry: decodedToken.exp,
      loggedIn: !!secondsUntilExpiry,
      tokenWillExpire: secondsUntilExpiry < 120,
    };
  } catch {
    return {};
  }
};

const getSecondsUntilExpiry = (expiry, time) => {
  try {
    const now = Math.round(time / 1000);
    return Math.max(expiry - now, 0);
  } catch {
    return 0;
  }
};

const TOKEN_LOCK_KEY = "TOKEN_LOCK";
const addTokenToStorage = (token) => {
  const tokenLock = localStorage.getItem(TOKEN_LOCK_KEY);

  if (storeValueIsUndefined(tokenLock)) {
    localStorage.setItem(TOKEN_LOCK_KEY, "writing"); // lock localStorage
  } else {
    console.warn("TOKEN_LOCK already in place");
    return false;
  }

  console.debug("TOKEN_LOCK aquired");
  localStorage.setItem("token", token);
  localStorage.removeItem(TOKEN_LOCK_KEY); // unlock localStorage
  console.debug("TOKEN_LOCK released");
  return true;
};

const removeTokenFromStorage = () => {
  localStorage.removeItem("token");
};

const removeDeviceFilterDataFromStorage = () => {
  const data = localStorage.getItem("deviceList");
  if (!data) return;
  const parsed = JSON.parse(data);
  if (parsed?.filterData) delete parsed.filterData;
  localStorage.setItem("deviceList", JSON.stringify(parsed));
};

const getTokenFromStorage = () => {
  return localStorage.getItem("token");
};
