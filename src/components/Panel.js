import { Outlet } from "react-router";
import { Header } from "./Header/Header";

export function Panel() {
  return (
    <>
      <Header />
      <div id="panel">
        <Outlet />
      </div>
    </>
  );
}
