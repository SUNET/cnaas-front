import React from "react";

export function Footer() {
  return (
    <footer>
      <p>
        Timezone: UTC |{" "}
        <a
          href="https://cnaas-nms.readthedocs.io/en/stable/index.html"
          key="footer_url_documentation"
          target="_blank"
          rel="noreferrer"
        >
          Documentation
        </a>{" "}
        {!process.env.MONITORING_WEB_URL && (
          <>
            |{" "}
            <a
              href={process.env.MONITORING_WEB_URL}
              key="footer_url_monitoring"
              target="_blank"
              rel="noreferrer"
            >
              Monitoring
            </a>
          </>
        )}
      </p>
    </footer>
  );
}
