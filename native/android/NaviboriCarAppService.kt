package com.navibori.car

import android.content.Intent
import androidx.car.app.CarAppService
import androidx.car.app.Session
import androidx.car.app.validation.HostValidator

/**
 * Foundation sketch for the future NAVIBORI Android Auto / Automotive target.
 * The production target must declare androidx.car.app.category.NAVIGATION.
 */
class NaviboriCarAppService : CarAppService() {
    override fun createHostValidator(): HostValidator =
        HostValidator.ALLOW_ALL_HOSTS_VALIDATOR

    override fun onCreateSession(): Session =
        NaviboriNavigationSession()
}

class NaviboriNavigationSession : Session() {
    override fun onCreateScreen(intent: Intent) =
        NaviboriNavigationScreen(carContext)
}
