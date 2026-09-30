import { Outlet } from "react-router";
import Box from "@mui/material/Box";
import { Header } from "./Header/Header";

export function Panel() {
  return (
    <>
      <Header />
      <Box sx={{ p: 2, display: "flex", flex: 1, flexDirection: "column" }}>
        <Outlet />
      </Box>
    </>
  );
}
