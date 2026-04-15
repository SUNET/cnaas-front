export function ImportInterfaceModal(props: {
  open: boolean;
  onClose: () => void;
  hostname: string;
  getInterfaceData: () => Promise<void>;
}): JSX.Element;
