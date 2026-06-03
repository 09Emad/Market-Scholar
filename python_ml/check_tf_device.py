import sys


def main() -> int:
    try:
        import tensorflow as tf
    except Exception as exc:
        print("TensorFlow import failed:", exc)
        print("Install dependencies first, then rerun this script.")
        return 1

    print("TensorFlow version:", tf.__version__)
    print("Built with CUDA:", tf.test.is_built_with_cuda())

    gpus = tf.config.list_physical_devices("GPU")
    cpus = tf.config.list_physical_devices("CPU")

    print("Detected GPUs:", gpus)
    print("Detected CPUs:", cpus)

    gpu_name = tf.test.gpu_device_name()
    print("Default GPU device name:", gpu_name if gpu_name else "None")

    if gpus:
        print("Result: TensorFlow can use GPU for training.")
    else:
        print("Result: TensorFlow will run on CPU.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
