import socketio from "socket.io-client";

export class SIOSource {
	constructor(options) {
		this.options = options;
		this.url = options.url;
		this.path = options.path;
		this.socket = options.videoConnection;
		this.streaming = true;

		this.callbacks = { connect: [], data: [] };
		this.destination = null;

		this.reconnectInterval =
			options.reconnectInterval !== undefined ? options.reconnectInterval : 5;
		this.shouldAttemptReconnect = !!this.reconnectInterval;

		this.completed = false;
		this.established = false;
		this.progress = 0;

		this.reconnectTimeoutId = 0;

		this.onEstablishedCallback = options.onSourceEstablished;
		this.onCompletedCallback = options.onSourceCompleted; // Never used
	}

	connect = (destination) => {
		this.destination = destination;
	};

	destroy = () => {
		clearTimeout(this.reconnectTimeoutId);
		this.shouldAttemptReconnect = false;
		if (this.socket && !this.options.videoConnection) {
			this.socket.close();
		}
	};

	start = () => {
		this.shouldAttemptReconnect = !!this.reconnectInterval;
		this.progress = 0;
		this.established = false;

		if (!this.socket) {
			this.socket = socketio(this.url, {
				path: this.path,
				transports: ["websocket"],
			});
			this.socket.on("connect", this.onOpen.bind(this));
			this.socket.on("disconnect", this.onClose.bind(this));
			this.socket.on("videoData", this.onMessage.bind(this));
		} else {
			this.socket.on("connect", this.onOpen.bind(this));
			// this.socket.on("disconnect", this.onClose.bind(this));
			this.socket.on("videoData", this.onMessage.bind(this));
		}
	};

	resume = (secondsHeadroom) => {
		// Nothing to do here
	};

	onOpen = () => {
		this.progress = 1;
	};

	onClose = () => {
		if (this.shouldAttemptReconnect) {
			clearTimeout(this.reconnectTimeoutId);
			this.reconnectTimeoutId = setTimeout(() => {
				this.start();
			}, this.reconnectInterval * 1000);
		}
	};

	onMessage = (ev) => {
		let isFirstChunk = !this.established;
		this.established = true;

		if (isFirstChunk && this.onEstablishedCallback) {
			this.onEstablishedCallback(this);
		}

		if (this.destination) {
			this.destination.write(ev);
		}
	};
}
