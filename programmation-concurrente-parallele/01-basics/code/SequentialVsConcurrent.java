public class SequentialVsConcurrent {
    private static final int TASK_COUNT = 4;

    public static void main(String[] args) throws InterruptedException {
        long sequentialStart = System.nanoTime();
        for (int i = 0; i < TASK_COUNT; i++) {
            simulatedTask("Sequential-" + i);
        }
        long sequentialTime = System.nanoTime() - sequentialStart;

        long concurrentStart = System.nanoTime();
        Thread[] threads = new Thread[TASK_COUNT];
        for (int i = 0; i < TASK_COUNT; i++) {
            final int taskNumber = i;
            threads[i] = new Thread(() -> simulatedTask("Concurrent-" + taskNumber));
            threads[i].start();
        }
        for (Thread thread : threads) {
            thread.join();
        }
        long concurrentTime = System.nanoTime() - concurrentStart;

        System.out.printf("Sequential: %.2f ms%n", sequentialTime / 1_000_000.0);
        System.out.printf("Concurrent: %.2f ms%n", concurrentTime / 1_000_000.0);
        System.out.println("Repeat the test: scheduling and hardware affect the result.");
    }

    private static void simulatedTask(String name) {
        System.out.println(name + " started");
        try {
            Thread.sleep(120);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
        System.out.println(name + " finished");
    }
}
