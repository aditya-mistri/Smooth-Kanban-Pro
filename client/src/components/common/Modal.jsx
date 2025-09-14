const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="relative">
      <div
        className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/70 z-[9998]"
        style={{ position: "fixed" }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] pointer-events-none"
        style={{ position: "fixed" }}
      >
        <div className="flex items-center justify-center min-h-full p-4">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
