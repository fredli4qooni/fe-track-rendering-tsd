import React from "react";
import { AiOutlineExclamationCircle } from "react-icons/ai";

import { Track } from "@type/track.types";

interface DeleteConfirmDialogProps {
	track: Track;
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

/**
 * Confirmation dialog modal for track deletion.
 * @param props - Component properties
 * @param props.track - Target track object to delete
 * @param props.isOpen - Whether dialog is visible
 * @param props.onClose - Dismiss callback
 * @param props.onConfirm - Confirm deletion callback
 * @returns React functional component rendering the confirmation dialog
 */
export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
	track,
	isOpen,
	onClose,
	onConfirm
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-montserrat">
			<div className="w-full max-w-sm bg-neutral-5 border border-red-500/50 rounded-xl shadow-2xl p-5 text-white">
				<div className="flex items-center gap-3 text-red-400 mb-3">
					<AiOutlineExclamationCircle size={26} />
					<h3 className="font-bold text-sm tracking-wide text-white">
						Konfirmasi Hapus Entity
					</h3>
				</div>

				<p className="text-xs text-neutral-2 mb-4 leading-relaxed">
					Apakah Anda yakin ingin menghapus entity{" "}
					<span className="font-bold text-white">#{track.id}</span> dari peta
					tactical display?
				</p>

				<div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-4">
					<button
						type="button"
						onClick={onClose}
						className="px-3.5 py-1.5 bg-neutral-4 hover:bg-neutral-3 text-white text-xs rounded transition-colors"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={() => {
							onConfirm();
							onClose();
						}}
						className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-medium rounded transition-colors shadow-lg"
					>
						Hapus Sekarang
					</button>
				</div>
			</div>
		</div>
	);
};

export default DeleteConfirmDialog;
