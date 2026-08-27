import { SiteFooter } from "@/components/shared/SiteFooter/SiteFooter";
import { SiteHeader } from "@/components/shared/SiteHeader/SiteHeader";
import styles from "./PageShell.module.scss";

type PageShellProps = Readonly<{
  activePath: string;
  children: React.ReactNode;
}>;

export const PageShell = ({ activePath, children }: PageShellProps) => (
  <div className={styles.shell}>
    <SiteHeader activePath={activePath} />
    <main className={styles.main}>{children}</main>
    <SiteFooter />
  </div>
);
