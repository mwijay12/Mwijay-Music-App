package mwijay.music.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import mwijay.music.app.MediaPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MediaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
