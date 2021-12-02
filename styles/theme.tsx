import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { deepPurple, amber, green, red } from "@mui/material/colors";

const paloAlto = {
  main: "#175E54",
  light: "#2D716F",
  dark: "#014240",
};

const cardinalRed = {
  main: "#8C1515",
  light: "#B83A4B",
  dark: "#820000",
};

let theme = createTheme({
  palette: {
    primary: cardinalRed,
    secondary: paloAlto,
  },
});

theme = responsiveFontSizes(theme);

export default theme;
