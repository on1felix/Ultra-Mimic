/** Auto-update payloads shared with the Rust updater. */

export interface UpdateInfo {
  /** Version of this build. */
  current: string;
  /** Version of the latest GitHub release. */
  latest: string;
  download_url: string;
  /** Asset size in bytes (0 when the release does not report it). */
  size: number;
  /** SHA-256 of the asset, when GitHub provides one. */
  sha256?: string | null;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percent: number;
  speed_mbps: number;
}