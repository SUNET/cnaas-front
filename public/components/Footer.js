import React from "react";

class Footer extends React.Component {
  render() {
    let monitoring_link = null;
    if (process.env.MONITORING_WEB_URL) {
      monitoring_link = [" | ", <a href={process.env.MONITORING_WEB_URL} key="footer_url_monitoring" target="_blank">Monitoring</a>];
    }
    return (
      <footer>
        <p>Timezone: UTC | <a href="https://cnaas-nms.readthedocs.io/en/stable/index.html" target="_blank" key="footer_url_documentation">Documentation</a>{monitoring_link}</p>
      </footer>
    );
  }
}

export default Footer;
