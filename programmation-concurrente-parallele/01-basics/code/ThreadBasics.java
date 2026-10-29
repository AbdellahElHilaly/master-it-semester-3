public class ThreadBasics {
    public static void main(String[] args) throws InterruptedException {
        Thread first = new Thread(new StudyTask("Thread-A"));
        Thread second = new Thread(new StudyTask("Thread-B"));

        first.start();
        second.start();

        // join() makes main wait until both tasks are finished.
        first.join();
        second.join();

        System.out.println("Main: both threads finished.");
    }

    private static class StudyTask implements Runnable {
        private final String name;

        StudyTask(String name) {
            this.name = name;
        }

        @Override
        public void run() {
            for (int step = 1; step <= 3; step++) {
                System.out.println(name + " -> step " + step);
                try {
                    Thread.sleep(80);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }
}
